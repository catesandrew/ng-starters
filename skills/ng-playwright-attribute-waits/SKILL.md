---
name: ng-playwright-attribute-waits
description: Use when writing or updating a Playwright spec or page-object method that must wait on async UI state — a spinner clearing, a modal closing, an optimistic update settling, a search debounce resolving, a counter advancing after a destructive action — before asserting against or interacting with the page. Covers keeping one canonical readiness/locators helper module every spec and page-object method imports rather than re-deriving a polling loop inline, a load-state gate checking for a transient error flash before asserting ready, a close/unmount gate waiting on a documented closed-attribute value with a visibility fallback, epoch-fencing that captures a counter before an action and polls until it strictly advances, a combined multi-attribute search-settle assertion, guarded JSON.parse of attribute-embedded data, named sentinels for known-bug outcomes, graceful degradation against uninstrumented components, and preferring an existing ARIA attribute over a bespoke data-* re-derivation. Does not define how components emit the data-*/aria-* attributes — that's the sibling skill ng-playwright-testid-attributes, which produces what this skill consumes — nor Page Object class structure — that's the sibling skill ng-playwright-page-objects, which calls these helpers but doesn't define them. Triggers on "wait for element ready", "flaky Playwright test", "toHaveAttribute data-load-state", "wait for modal to close", "epoch fencing", "search debounce settle", "expect.poll multiple attributes", "parse JSON from a data attribute in a test", "known bug sentinel in an e2e assertion", or writing/reviewing a Playwright wait against instrumented async UI state.
---

# ng-playwright-attribute-waits

## Overview

A component that exposes its async state through `data-*`/`aria-*` attributes
is only half the contract. The other half is a test suite that waits on those
attributes *correctly* — polling the right value, in the right order, from
exactly one place — instead of guessing with a `waitForTimeout` or
reimplementing a slightly different polling loop in every file that needs one.
This skill is that other half: a small set of shared helpers plus the rules
for using them.

```
component emits data-*/aria-* state   (sibling skill: the producer)
                    │
                    ▼
   ONE canonical readiness/locators helper module
   waitForReady · waitForClosed · waitForEpochAdvance · waitForSearchSettled
                    │
        ┌───────────┴────────────┐
        ▼                        ▼
  Playwright spec        Page Object method
  imports the helpers    imports the helpers
  (sibling skill: the Page Object structure itself is out of scope here)
```

Everything below assumes the attributes already exist on the page. If they
don't yet, that's a different problem — see the "does not define" clause in
this skill's description for where that lives.

## The 9 invariants

Create one todo per invariant. Each is independently verifiable.

1. **Exactly one canonical readiness/locators helper module per test suite.**
   Every spec and every page-object method that needs to wait on async state
   imports shared `waitForReady`/`waitForClosed`/`waitForSearchSettled`-style
   helpers from that one module (`references/readiness.ts`) — it never
   re-derives a polling loop inline, per-file. The wrong pattern: a second
   spec file copy-pastes (or writes its own slightly different version of) the
   same "poll an attribute until it says ready" loop, which then silently
   drifts from the canonical version the next time the load-state contract
   changes — one file gets fixed, the copy doesn't, and it starts flaking for
   a reason nobody can find without diffing two loops that were never supposed
   to diverge. The right pattern is a single `import { waitForReady } from
   './readiness'` everywhere the wait is needed. This is the single most
   important, most concrete lesson in this skill — everything else assumes it
   holds.

2. **Load-state gate: check the negative case first.** When a transient error
   flash is possible — a request that briefly renders an error state before a
   retry succeeds — assert `not.toHaveAttribute('data-load-state', 'error')`
   FIRST, then assert `toHaveAttribute('data-load-state', 'ready')`
   (`waitForReady` in `references/readiness.ts`). Checking only the positive
   case can pass while missing a real bug: the UI errored, recovered, and the
   test never noticed the error ever happened, because by the time the
   assertion ran the attribute already said "ready."

3. **Close/unmount gate: wait for the documented value, not just hidden.**
   Wait for the documented "closed" attribute value (`waitForClosed` in
   `references/readiness.ts`) rather than relying on `toBeHidden()` alone — an
   element can be hidden for many transient reasons (an animation mid-flight,
   a parent re-render, a CSS transition) that have nothing to do with "the
   intended close/unmount actually finished." Fall back to a visibility-only
   check for older or uninstrumented components that don't expose the
   attribute yet (this is also invariant 8's degrade-gracefully rule applied
   to the specific case of closing).

4. **Epoch-fencing: capture, act, then poll for strict advance.** Capture the
   epoch attribute's value BEFORE triggering an action, trigger the action,
   then poll until the epoch is strictly greater than the captured value
   (`waitForEpochAdvance` in `references/readiness.ts`). For destructive
   actions, additionally assert the expected structural side effect (e.g. a
   row is actually gone from the table) rather than trusting the terminal
   state string alone — a state string like `"done"` can repeat identically
   across two separate action cycles, so on its own it can't distinguish "the
   action you just triggered finished" from "the previous action's terminal
   state is still sitting there."

5. **Search-settle: poll every tracked attribute together, not one at a
   time.** Poll ALL tracked search-pipeline attributes in a single combined
   assertion — e.g. one `expect.poll(...).toEqual({ state, query, loading })`
   covering the load state, the requested/echoed query value, and a loading
   flag together (`waitForSearchSettled` in `references/readiness.ts`) —
   rather than checking one attribute in isolation. A partial check is a
   well-known source of flaky search-related test failures: one attribute can
   read "ready" while a sibling attribute still lags the just-typed query,
   and a test that only checks the first attribute asserts against results
   for the wrong search term.

6. **Guard every JSON-in-attribute parse.** JSON-in-attribute values must be
   parsed with `JSON.parse` wrapped in try/catch plus a shape guard (e.g.
   `Array.isArray`, or an equivalent check for the expected structure) —
   never assume the attribute is well-formed (`parseAttributeJson` in
   `references/readiness.ts`). When both a visible and a hidden-sentinel copy
   of the same JSON attribute exist on the page, read both and union the
   results rather than trusting whichever one happens to be queried first.

7. **Known-bug outcomes get a named sentinel, in a distinct branch.**
   Known-bug or otherwise ambiguous outcomes should be checked against a
   named sentinel constant (e.g. `const KNOWN_DUPLICATE_SUBMIT_BUG =
   'duplicate-submit'`) in a distinct code branch — never inline a magic
   string, and never silently merge a "known, tolerated bug" outcome into a
   plain pass/fail. A test that folds a known-bug outcome into the happy path
   stops distinguishing "this actually passed" from "this hit the bug we're
   choosing to tolerate for now," and both facts matter for anyone reading the
   test later.

8. **Degrade gracefully when instrumentation is missing.** When testing
   against an older or uninstrumented component that doesn't expose the
   expected attributes, fall back to a coarser check (a visibility wait, a
   bounded sleep) and log a diagnostic explaining why the fallback was taken —
   never hard-throw just because expected attributes aren't present. The goal
   is a test that still runs (more coarsely) against legacy UI, not a test
   suite that can only run against fully-instrumented components.

9. **Prefer an ARIA attribute already carrying the state.** When the producer
   side used ARIA attributes as the primary state signal (per the sibling
   producer skill's guidance), prefer waiting on the ARIA attribute directly —
   `toHaveAttribute('aria-expanded', 'true')`, `toHaveAttribute('aria-pressed',
   'true')` — rather than falling back to a bespoke `data-*` re-derivation of
   a state ARIA already expresses. Two attributes tracking the same state is
   two places that can drift out of sync; when one already exists and is
   authoritative, wait on that one.

## Red flags

- A local re-implementation of a helper that already exists in the shared
  readiness module — invariant 1; this is the drift bug waiting to happen.
- A single-attribute search check instead of a combined `expect.poll(...)`
  over all tracked search attributes — invariant 5.
- An epoch check that trusts the terminal state string alone, without also
  checking that the epoch counter itself advanced — invariant 4.
- An un-guarded `JSON.parse` on an attribute value, with no try/catch or shape
  guard — invariant 6.
- Asserting a bespoke `data-*` attribute when the equivalent `aria-*`
  attribute is already present and sufficient — invariant 9.

## References

- `references/readiness.ts` — the canonical helper module: `waitForReady`
  (load-state gate), `waitForClosed` (close/unmount gate with a visibility
  fallback), `waitForEpochAdvance` (epoch-fencing via `expect.poll`),
  `waitForSearchSettled` (combined multi-attribute search-settle check), and
  `parseAttributeJson` (guarded JSON parse), plus a side-by-side WRONG/RIGHT
  example of invariant 1 — a duplicated inline polling loop versus importing
  the shared helper.
- Companion skill: `skills/ng-playwright-testid-attributes` — the producer
  side; emits the `data-*`/`aria-*` attributes this skill's helpers wait on.
- Companion skill: `skills/ng-playwright-page-objects` — its action methods
  call these readiness helpers around interactions (invariant 3).
- A Playwright suite against an Nx-workspace Angular app needs the target
  app's dev server already running (e.g. `nx serve <app>`) before any of
  these waits have anything to wait on.

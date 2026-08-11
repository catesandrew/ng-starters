# ng-playwright-attribute-waits

Wait correctly on the `data-*`/`aria-*` state a component exposes, instead of
guessing with a `waitForTimeout` or writing a slightly-different polling loop
in every spec file that needs one. This is the consumer half of the
attribute-instrumentation story: it assumes the attributes already exist on
the page and gives you one small, shared set of helpers for waiting on them
correctly, in the right order, every time.

## What it covers

- One canonical readiness/locators helper module, imported everywhere a wait
  is needed — never re-derived inline, per file.
- A load-state gate that checks for a transient error flash before asserting
  ready.
- A close/unmount gate that waits on a documented closed-attribute value, with
  a visibility fallback for uninstrumented components.
- Epoch-fencing: capture a counter before an action, poll until it strictly
  advances, and pair that with a structural assertion for destructive actions.
- A combined multi-attribute search-settle check instead of a single-attribute
  guess.
- Guarded `JSON.parse` on attribute-embedded data, named sentinels for
  known-bug outcomes, and preferring an ARIA attribute when one is already
  authoritative.

## Use it

Read `SKILL.md` for the 9 invariants and the red flags that call each one
out. Import the helpers from `references/readiness.ts` — `waitForReady`,
`waitForClosed`, `waitForEpochAdvance`, `waitForSearchSettled`,
`parseAttributeJson` — into your suite's own canonical readiness module
(invariant 1), rather than copying the polling logic inline per spec.

## Install globally

```bash
skills add git@github.com:catesandrew/ng-starters.git --skill skills/ng-playwright-attribute-waits -g
```

## Companion

This skill only covers waiting on state that's already exposed on the page.
It pairs with a sibling skill that defines how components emit those
`data-*`/`aria-*` attributes in the first place — this skill is downstream of
that one, consuming what it produces — and with a sibling page-objects skill
that defines the class structure calling these wait helpers, without itself
defining what the helpers do.

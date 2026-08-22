---
id: ng-playwright-attribute-waits
title: ng-playwright-attribute-waits
sidebar_position: 8
---

# ng-playwright-attribute-waits

## What it does

`ng-playwright-attribute-waits` is the consumer-side half of the producer
contract that `ng-playwright-testid-attributes` defines: a component that
emits `data-*`/`aria-*` state is only half the story, and this skill is the
other half — a test suite that waits on those attributes *correctly* instead
of guessing with `waitForTimeout` or re-deriving a slightly different polling
loop in every file that needs one.

Its nine invariants center on one rule above the rest: exactly one canonical
readiness/locators helper module (`waitForReady`, `waitForClosed`,
`waitForEpochAdvance`, `waitForSearchSettled`) that every spec and page-object
method imports, never re-implements. Beyond that: a load-state gate that
checks the negative case (a transient error flash) before the positive
("ready") case; a close/unmount gate that waits for a documented attribute
value rather than trusting `toBeHidden()` alone, with a visibility fallback
for uninstrumented components; epoch-fencing that captures a counter before
an action and polls until it strictly advances; a combined multi-attribute
`expect.poll(...)` for search-settle instead of checking one attribute at a
time; guarded `JSON.parse` on any attribute-embedded data; named sentinels
(not inline magic strings) for known-bug outcomes; graceful degradation
against legacy, uninstrumented components; and preferring an existing ARIA
attribute over a bespoke `data-*` re-derivation when one is already
authoritative.

## Why it was created

Per commit `f012bc9` ("feat(skills): add ng-playwright-\* skill family
(Angular 21+ Playwright testing)"), this skill ports next-starters'
`playwright-attribute-waits` skill to Angular as part of the same
research-grounded rollout as its three sibling skills, rather than a blind
rename.

The follow-up architect review, per commit `ca86d59` ("fix: address
architect review findings on ng-playwright-\* skills"), found and fixed an
environment-specific error in this skill: a dangling reference to
`docs/LOCAL-DEV-RUNBOOK.md` plus a `pnpm-dev`/`process-compose` workflow had
been inherited from the next-starters original, but this repo has neither.
It was retargeted to `nx serve`, which the skill's own SKILL.md now reflects
directly — its final reference note reads, "A Playwright suite against an
Nx-workspace Angular app needs the target app's dev server already running
(e.g. `nx serve <app>`) before any of these waits have anything to wait on."
That fix is a small but concrete example of the same grounding discipline
behind the whole family: a runbook reference that looked plausible but
didn't match the actual repo it now lives in.

## How to use it

Import the shared helpers from one canonical readiness module rather than
writing a new polling loop per file. Around a load-state assertion, check
`not.toHaveAttribute('data-load-state', 'error')` before asserting `'ready'`.
Around a close action, wait for the documented closed-state attribute value,
not just visibility. Around a repeatable destructive action, capture the
epoch attribute before triggering it and poll until it strictly advances,
plus assert the expected structural side effect (e.g. a row is actually
gone). For a debounced search, assert all tracked attributes together in one
`expect.poll(...)`, not one at a time. When a component doesn't expose the
expected attributes yet, fall back to a coarser visibility/sleep check and
log why, rather than hard-failing. See `/docs/usage-examples` for a worked
example wiring a debounced-search wait end to end.

## Companion skills

- **`ng-playwright-testid-attributes`** — the producer side; emits the
  `data-*`/`aria-*` attributes this skill's helpers wait on.
- **`ng-playwright-page-objects`** — its action methods call these readiness
  helpers around every interaction (its invariant 3).

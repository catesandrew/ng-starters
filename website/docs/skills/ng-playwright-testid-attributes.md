---
id: ng-playwright-testid-attributes
title: ng-playwright-testid-attributes
sidebar_position: 5
---

# ng-playwright-testid-attributes

## What it does

`ng-playwright-testid-attributes` is the **producer** side of a three-skill
Playwright family. It defines how to instrument an Angular template — a
modal, a drawer, an async data table, or any component whose visible content
depends on async loading or mutation state — with `data-*`/`aria-*`
attributes that are bound, via Angular's `[attr.*]` syntax, to the *exact
same Signal* that drives the component's render. The point is that Playwright
can only trust what the DOM tells it, and that's only true when a
`data-load-state` or `aria-busy` attribute reads the same `signal()`/
`computed()`/`input()` the template's `@if` block reads — never a parallel
computation that can drift from what's actually on screen.

The skill's 10 invariants cover the `data-state`/`data-load-state` baseline
pair, mirroring `aria-busy` off the same loading Signal, monotonically
incrementing `data-<action>-epoch` counters for repeatable actions like
delete/refresh/retry, the four-stage debounced-search attribute pattern,
`JSON.stringify`-in-a-`computed()` for identity attributes, the Angular-
specific `@if`-unmount hazard (and when a hidden sentinel is and isn't
required), pulling every `data-testid` from a typed catalog rather than a
literal, and preferring an existing ARIA attribute over a bespoke `data-*`
one. It does not define the testid catalog mechanics or the test-side wait
helpers — those belong to its two sibling skills.

## Why it was created

Per commit `f012bc9` ("feat(skills): add ng-playwright-\* skill family
(Angular 21+ Playwright testing)"), this skill ports next-starters'
`playwright-testid-attributes` skill to Angular — but deliberately not as a
blind rename. The commit message frames it as grounded in real research
against `arcos-web`'s live Angular 21.1.2 codebase (a component library
referred to internally as Pinnacle), and the skill's own `metadata.json`
abstract backs this up: it cites the Signal-to-`[attr.*]` binding idiom from
`dropdown`, `text-area`, and app-level components, and notes that invariant 7
(the `@if`-unmount hazard) was re-derived from the compiled vendor modal
rather than assumed — the modal does **not** unmount on close, unlike the
React original's Radix/shadcn assumption, so a sentinel is only needed when a
consumer wraps it in `@if` (73 of 215 surveyed usages, per the skill's own
invariant 7).

A follow-up architect review, per commit `ca86d59` ("fix: address architect
review findings on ng-playwright-\* skills"), caught two concrete grounding
errors in this skill specifically and fixed them:

- `async-details-modal.component.html`'s "invariant-7" sentinel comment
  contradicted what the code actually demonstrated — the sentinel was inside
  the component, but the comment claimed it showed sentinel placement outside
  a consumer's `@if`. The fix added a real consumer-sibling-sentinel example.
- `async-data-table.component.html` had four hand-written `data-testid`
  literals that violated the skill's own invariant 8 (testids must come from
  a typed catalog, not literals). The fix routed them through a mock
  `TESTIDS` catalog.

That review pass is part of the skill's credibility story, not incidental
cleanup: the value proposition isn't just "we needed Angular versions of
these skills," it's "we needed Angular skills whose claims are independently
verifiable against real code" — see commit `ca86d59`'s own message
(`fix: address architect review findings on ng-playwright-\* skills`) for
the concrete errors it caught and fixed, itemized above.

## How to use it

Bind state-marker attributes straight from the render-driving Signal —
`[attr.data-load-state]="loadState()"`, `[attr.aria-busy]="isLoading()"` —
rather than introducing a second field that could go stale under `OnPush`.
For a repeatable async action, hold a `signal<number>(0)` epoch counter and
bump it in a `finally` block. For an `@if`-gated modal or drawer, render a
permanently-mounted hidden sentinel *outside* the `@if`, carrying the same
`data-state`/`data-load-state` pair, so a test still has something to read
after the subtree is destroyed. See `/docs/usage-examples` for a worked
walkthrough of wiring these attributes onto a new async component.

## Companion skills

- **`ng-playwright-testid-catalog`** — the canonical, authoritative home for
  the typed `data-testid` registry this skill's invariant 8 points to; every
  `data-testid` value bound onto a component comes from that catalog, never a
  literal string.
- **`ng-playwright-attribute-waits`** — the consumer side; reads and waits on
  the exact attributes this skill teaches you to produce.

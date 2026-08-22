---
id: ng-playwright-page-objects
title: ng-playwright-page-objects
sidebar_position: 7
---

# ng-playwright-page-objects

## What it does

`ng-playwright-page-objects` defines the **output shape** of a Playwright
Page Object — the typed façade over one route that owns its locators and
small actions/assertions, so specs read as intent ("search, then verify the
row appears") instead of raw selector plumbing. It covers class structure and
selector/wait discipline only, not how you discover what's on a page in the
first place (that stays a general, tool-agnostic step, not owned by any
skill).

Its six invariants specify: a shared `BasePage` base class exposing `route`,
`navigate()`, and a `constructor(page: Page)`, with locators as `get`
accessors and `verify*` assertion methods that call `expect` internally
rather than returning a boolean; a selector priority ladder of
role-based → label/text → typed-catalog `data-testid` → CSS class last
(deliberately, because a role/label selector doubles as a live accessibility
check that a bare testid selector can't provide); action methods that call
named readiness-wait helpers instead of a bare `waitForTimeout()` (and if one
is truly unavoidable, it must carry a comment justifying the exact
millisecond budget); one page-object file per route with a deterministic
naming rule; a hard boundary keeping business/domain flow logic out of page
objects; and the idea that a stub page object (just `route` + a title
locator) is a legitimate first commit, with expansion purely additive.

## Why it was created

Per commit `f012bc9` ("feat(skills): add ng-playwright-\* skill family
(Angular 21+ Playwright testing)"), this skill ports next-starters'
`playwright-page-objects` skill to Angular as part of the same
research-grounded effort as its siblings — checked against `arcos-web`'s
real Angular 21.1.2 codebase rather than assumed to transfer unchanged.

The follow-up architect review, per commit `ca86d59` ("fix: address
architect review findings on ng-playwright-\* skills"), found and fixed a
concrete grounding error specific to this skill: `ExampleDataTablePage.ts`
had been framed around Angular Material, but the real source codebase
declares `@angular/material` as a dependency without actually using it —
that reference component was retargeted to Pinnacle's actual `lib-table`.
As with the other skills in this family, that correction is part of why the
skill is trustworthy, not an unrelated cleanup: its examples now describe
the component library this repo's target codebase genuinely uses.

## How to use it

Extend `BasePage` for a new route, deriving the file path and class name
mechanically from the route (segments → PascalCase, suffixed `Page`). Start
with a stub — `route` and a title locator — and expand it additively as
specs need more of the page. Reach for `getByRole()` with an accessible name
first; fall back to `getByLabel()`/`getByText()`; only drop to a
catalog-sourced `getByTestId()` when no reliable role/label/text exists, and
never to a CSS class if any alternative is available. Wrap every interaction
in a readiness-wait helper from the sibling skill rather than a fixed sleep.
Keep multi-step business flows out of the page object itself — compose them
at a higher test/flow layer that calls into one or more page objects. See
`/docs/usage-examples` for a worked example expanding a stub page object.

## Companion skills

- **`ng-playwright-attribute-waits`** — supplies the readiness-wait helper
  implementations this skill's action methods call into (invariant 3).
- **`ng-playwright-testid-catalog`** — supplies the typed ids used as the
  selector-priority fallback (invariant 2) when no reliable role/label
  exists.

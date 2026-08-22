---
id: ng-playwright-testid-catalog
title: ng-playwright-testid-catalog
sidebar_position: 6
---

# ng-playwright-testid-catalog

## What it does

`ng-playwright-testid-catalog` is the canonical, authoritative home for how a
`data-testid` catalog is built, validated, and mirrored into the test
runner. Rather than scattering `data-testid` string literals across Angular
components and Playwright specs, each feature area gets one typed catalog
module built via a shared `createTestIdRegistry` helper. That helper walks a
nested, section-keyed object (`list`/`detail`/`create`/`edit`/`dialogs`,
each holding elements suffixed by kind — `-page`, `-button`, `-input`) and
throws on any duplicate leaf value in dev mode, so two features can never
silently collide on the same id.

A Playwright-side mirror module re-exports the identical catalog object —
not a retyped copy — so app code and spec code read from the same in-memory
object and can never drift apart on an id string; a rename breaks the
mirror's import at compile time instead of leaving a stale string alive in a
spec. Dynamic per-row ids follow a documented `prefix-${id}` convention
(e.g. `widgetRow(id)` → `` `widgets-row-${id}` ``), with an optional
regex-based reverse-parse fallback for recovering an id from a harvested
element list. The skill closes with an independently-automatable
verification loop — typecheck, a dev-mode run (to actually trigger the
uniqueness check), and a lint pass for literal `data-testid` strings — since
each check catches a failure mode the other two miss.

## Why it was created

Per commit `f012bc9` ("feat(skills): add ng-playwright-\* skill family
(Angular 21+ Playwright testing)"), this skill ports next-starters'
`playwright-testid-catalog` skill to Angular as part of the same
research-grounded effort described for its sibling skills — not a blind
rename, but re-derived against a real Angular 21 codebase where relevant.
For this particular skill, the skill's own `metadata.json` abstract is
explicit about *how little* actually needed re-deriving: "the registry/mirror
mechanics are pure TypeScript with no framework dependency, so they are
carried over unchanged from the React/Next.js original; only the
component-binding illustration is adapted to Angular's `[attr.data-testid]`
template-binding syntax."

Commit `ca86d59`'s own message
(`fix: address architect review findings on ng-playwright-\* skills`) does
not call out a skill-specific grounding correction for
`ng-playwright-testid-catalog` (unlike `ng-playwright-testid-attributes`,
`ng-playwright-page-objects`, and `ng-playwright-attribute-waits`, each of
which gets a named fix in that same commit message) — so, consistent with
this skill's own `metadata.json` abstract quoted above about how little
actually needed re-deriving, this page reports that absence rather than
fabricating a review finding for this skill.

## How to use it

Stand up one catalog module per feature area by calling
`createTestIdRegistry` on a nested object literal, grouped by view/section
with the documented element-suffix vocabulary. Bind components to it via
`[attr.data-testid]="CATALOG.section.element"` — never a hand-written
literal. Create a matching mirror module that re-exports (or dynamically
imports) that same object for Playwright specs and page objects to import
from. For an uncatalogued element, use the documented colon-delimited
`root:segment:segment` compound-id convention rather than an ad hoc string,
so it stays grep-able and migratable later. See `/docs/usage-examples` for a
worked example of adding a catalog entry for a new feature.

## Companion skills

- **`ng-playwright-testid-attributes`** — the producer side; binds the
  catalog ids this skill defines onto actual Angular components (its
  invariant 8 points here for the canonical rule).

---
name: ng-playwright-testid-catalog
description: Use when adding data-testid attributes for a new feature area, or migrating hardcoded testid strings scattered across Angular components and Playwright specs into a single typed catalog. Covers a shared registry helper that builds a nested, section-keyed object of test-id strings and validates uniqueness at dev-time (throws on duplicate), a documented element-suffix vocabulary for naming ids by view (list/detail/create/edit/dialogs), a Playwright-side mirror module that re-exports the exact same catalog object so app code and test code can never drift apart on an id string, and a dynamic per-row prefix-${id} convention with an optional reverse-parse fallback for recovering ids from a harvested element list. Unlike ng-playwright-testid-attributes, which consumes catalog ids in Angular components but doesn't define the registry/mirror mechanics itself, this skill is the canonical, authoritative home for how the catalog is built, validated, and mirrored into the test runner. Triggers on "data-testid catalog", "typed test ids", "testid registry", "duplicate testid", "migrate hardcoded testid strings", "playwright mirror module", "test id naming convention", "prefix-${id} row ids", or standing up the catalog layer for a new feature area.
---

# ng-playwright-testid-catalog

## Overview

A `data-testid` catalog turns test selectors into typed constants instead of
scattered string literals. One registry helper builds a nested, per-feature
catalog object; Angular components bind to it directly; a Playwright-side
mirror module re-exports the identical object so the same string constant
reaches both app code and spec code. The registry validates uniqueness at
dev-time so two features can never silently collide on the same id, and the
mirror makes app/test drift structurally impossible rather than merely
policy-discouraged.

```
Angular components ([attr.data-testid]="CATALOG.section.element")
        │
        ▼
createTestIdRegistry(rawCatalog)  ──▶  CATALOG (as const, uniqueness-checked)
        │                                        │
        │                          re-exported / dynamically imported
        ▼                                        ▼
   app bundle                          example-catalog.mirror.ts
                                                  │
                                                  ▼
                                   Playwright specs & page objects
                                   (CATALOG.section.element, never a literal)
```

Each feature area owns exactly one catalog module. The registry helper is the
only place uniqueness is checked; the mirror module is the only bridge
between the app's catalog and the test runner's imports.

**Why a mirror module, not a shared package:** a shared package works too,
but it adds a build/publish step most feature-level test-id catalogs don't
need. A mirror module that imports (or dynamically imports) the app's
catalog file directly gets the same zero-duplication guarantee with none of
that overhead — the tradeoff is that the mirror can only reach catalog
modules the Playwright config's module resolution can already see. Switch to
a shared package once several apps need the same catalog, not before.

## The 7 invariants

Create one todo per invariant. Each is independently verifiable.

1. **One typed catalog module per feature area, built via a shared registry
   helper.** Each feature gets its own catalog module that calls a single
   shared `createTestIdRegistry` helper (`references/utils.ts`) rather than
   hand-rolling a plain object literal. The helper walks the nested structure
   at call time, collects every leaf string value, and throws a clear `Error`
   listing the offending duplicates when `process.env.NODE_ENV ===
   'development'` — so a copy-pasted id string surfaces immediately in a dev
   session instead of silently shadowing another element in production or CI.

2. **Catalog keys are nested by view/section with a documented
   element-suffix vocabulary.** Keys are grouped under `list`, `detail`,
   `create`, `edit`, and `dialogs` sections (`references/example-catalog.ts`),
   each holding elements suffixed by kind — `-page`, `-button`, `-input`,
   `-table`, `-row` — so a reader can tell what DOM role an id targets
   without opening the component. This vocabulary is a convention, not
   something the registry helper enforces mechanically; consistency comes
   from every catalog module following the same shape.

3. **A Playwright-side mirror module re-exports the exact same catalog
   object — zero string duplication.** `references/example-catalog.mirror.ts`
   imports (or dynamically imports at runtime) the identical object the app
   ships, rather than retyping the id strings into a second, parallel catalog
   for specs. Because both sides read the same in-memory object, there is no
   second copy to fall out of sync — a renamed or removed id breaks the
   mirror's import at compile time instead of leaving a stale string alive in
   test code.

4. **Canonical rule: components bind `[attr.data-testid]="CATALOG.section.element"`
   — never a hand-written literal string.** A sibling skill,
   ng-playwright-testid-attributes, also states a version of this rule from
   the consumption side, but this skill is the canonical, authoritative home
   for it — the registry and mirror mechanics it depends on live here. Any
   `data-testid="literal-string"` in a component is the rule broken at the
   source, not a downstream symptom.

5. **Specs and page objects reference `CATALOG.section.element` — never a
   literal string.** For an element that hasn't been catalogued yet, use one
   documented compound-id convention instead of inventing an ad hoc string —
   a colon-delimited `root:segment:segment` — so uncatalogued ids stay
   grep-able as a group and can be migrated into the catalog later in one
   pass rather than hunted individually.

6. **Dynamic per-row/per-item ids use a documented `prefix-${id}`
   convention, with an optional reverse-parse fallback.** A catalog entry for
   a repeated row exposes a function like `widgetRow(id)` returning
   `` `widgets-row-${id}` `` (`references/example-catalog.ts`) rather than a
   static string, so every row gets a distinct, predictable id. A
   regex-based reverse-parse helper that recovers the original `id` from a
   harvested list of rendered elements is a last-resort fallback for
   debugging or migration — not the primary path; the primary path is always
   constructing the id from the known key.

7. **Independently-automatable verification loop: typecheck, dev-mode run,
   lint.** Typechecking confirms every catalog import in app and spec code
   still resolves after a rename or refactor; running the app in dev mode
   confirms the registry's uniqueness validation actually fires (it's gated
   on `NODE_ENV === 'development'`, so a duplicate silently ships if this
   step is skipped); linting for literal `data-testid` strings confirms
   invariants 4 and 5 weren't bypassed by hand. Each check catches a failure
   mode the other two miss, so all three belong in CI, not just one.

## Red flags

- A literal `data-testid="..."` string anywhere in app or spec code →
  invariants 4/5 broken; grep for the pattern to catch regressions.
- A catalog key collision — two features accidentally reusing the same id
  string → invariant 1's uniqueness check should catch this in dev mode; if
  it doesn't fire, the dev-mode step of the verification loop was skipped.
- A spec file importing test ids by copy-pasted string instead of from the
  mirror module → invariant 3 broken; the string can drift from the app's
  catalog with no compiler signal to catch it.
- A dynamic row id built by string-concatenating a literal prefix inline in a
  spec, instead of calling the catalog's row function → invariant 6 broken;
  a prefix rename in the catalog won't be caught by that spec.

## References

- `references/utils.ts` — the `createTestIdRegistry` helper: nested
  uniqueness validation gated on `NODE_ENV === 'development'`, returns the
  catalog typed `as const`, plus a `TestIdValues<T>` type helper for deriving
  a union of every leaf value.
- `references/example-catalog.ts` — a genericized example feature catalog
  (list/detail/create/edit/dialogs sections, a dynamic per-row id function,
  and its reverse-parse fallback) built with the registry helper.
- `references/example-catalog.mirror.ts` — the Playwright-side mirror module
  re-exporting the example catalog, with inline notes on when a straight
  re-export is enough versus when to switch to a runtime dynamic import.
- Companion skill: `skills/ng-playwright-testid-attributes` — the producer
  side; binds the catalog ids this skill defines onto actual Angular
  components.

# ng-playwright-testid-catalog

Build a single typed `data-testid` catalog per feature area instead of
scattering string literals across Angular components and specs. A shared
registry helper validates id uniqueness at dev-time, and a Playwright-side
mirror module re-exports the exact same catalog object so app code and test
code can never drift apart on an id string.

## What it covers

- A `createTestIdRegistry` helper that builds a nested, `as const` catalog
  object and throws on duplicate leaf string values in development.
- A documented key/suffix vocabulary — sections (list/detail/create/edit/
  dialogs) and element suffixes (-page/-button/-input/-table/-row) — so ids
  are readable without opening the component that renders them.
- A mirror module for the Playwright side that re-exports the identical
  catalog object, plus a `prefix-${id}` convention (with a reverse-parse
  fallback) for dynamic per-row ids.

## Use it

Read `SKILL.md` for the 7 invariants and the three-step verification loop
(typecheck → dev-mode run → lint). Copy the genericized templates from
`references/` (`utils.ts`, `example-catalog.ts`,
`example-catalog.mirror.ts`) as the starting shape for a new feature's
catalog.

## Install globally

Symlink into your global skills the same way as the other ng-starters skills:

```bash
skills add git@github.com:catesandrew/ng-starters.git --skill skills/ng-playwright-testid-catalog -g
```

## Companion

Pairs with ng-playwright-testid-attributes, ng-playwright-attribute-waits,
and ng-playwright-page-objects. This skill defines the registry and mirror
mechanics that produce the catalog in the first place; those companion
skills consume catalog ids inside Angular components, waits, and page
objects respectively, without redefining how the catalog itself is built,
validated, or mirrored.

## Ported from

Ported from `next-starters`'s `playwright-testid-catalog` skill. The
registry/mirror mechanics are pure TypeScript with no framework dependency,
so they carry over unchanged; only the component-binding illustration is
adapted to Angular's `[attr.data-testid]` template syntax.

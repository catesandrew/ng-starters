# ng-playwright-testid-attributes

Instrument Angular components — modals, drawers, async data tables, anything
whose visible content depends on loading or mutation state — with
`data-*`/`aria-*` attributes bound from the exact Signal driving the render,
so Playwright can assert on state transitions instead of racing timeouts or
scraping visible text.

## What it covers

- Deriving `data-state` / `data-load-state` / `aria-busy` from the
  render-driving `signal()` / `computed()` / `input()`, bound through
  `[attr.*]`, never a parallel computation.
- Epoch counters for repeatable async actions (delete, refresh, retry).
- The four-stage debounced-search attribute pattern.
- `JSON.stringify`-ing identity-sensitive attributes in a memoized
  `computed()` instead of exposing only a count.
- The `@if`-unmount hazard: when a hidden sentinel is required, where it must
  be placed, and why a stays-mounted modal needs `data-state` rather than a
  presence check.
- Preferring `aria-expanded` / `aria-pressed` / `aria-selected` over bespoke
  `data-*` equivalents.

## Use it

Read `SKILL.md` for the 10 invariants and the worked reasoning behind each.
Copy the genericized patterns from `references/`
(`async-details-modal.component.ts`/`.html`,
`async-data-table.component.ts`/`.html`) as a starting point for
instrumenting your own components.

## Install globally

```bash
skills add git@github.com:catesandrew/ng-starters.git --skill skills/ng-playwright-testid-attributes -g
```

## Companion

This skill only covers instrumenting components with state attributes — it
pairs with ng-playwright-testid-catalog, which defines the typed catalog those
components' `data-testid` values are pulled from, and with
ng-playwright-attribute-waits, which covers how test code reads and waits on
the attributes this skill produces. Together the three cover the full
producer-to-consumer path from component template to a passing Playwright
assertion.

## Ported from

Ported from `next-starters`'s `playwright-testid-attributes` skill. Unlike the
other skills in this family, this one required genuine Angular rework rather
than a rename: the binding surface changes from JSX attribute spread to
`[attr.x]="signal()"` template bindings, and invariant 7 (the hidden sentinel)
was re-derived from real source rather than carried over.

The React original assumes a Radix/shadcn `Dialog`/`Sheet` that unmounts its
content on close. That assumption does not hold for Angular's Pinnacle design
system: `lib-modal-popup` renders unconditionally and only toggles a
`.is-open` host class, and the vendor `<ea-modal>` beneath it does the same —
confirmed from the compiled component, whose content projection slot is
created unconditionally and whose only conditional block is the header. So the
sentinel is not needed because of the modal primitive. It *is* still needed
when a consumer wraps the component in an `@if`, which really does destroy the
DOM — about a third of real usages in the surveyed codebase do exactly that.
See invariant 7 for the full finding with citations.

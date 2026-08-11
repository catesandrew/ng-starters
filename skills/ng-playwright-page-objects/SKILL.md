---
name: ng-playwright-page-objects
description: Use when creating a new Playwright Page Object class, or expanding a stub one into a fully-locator'd, action-bearing page object. Covers the class STRUCTURE and selector/wait DISCIPLINE only — a shared BasePage constructor and navigate() contract, get-accessor locators, verify* assertion methods that assert internally instead of returning a boolean, a role-then-label-then-testid-then-CSS selector priority ladder with the accessibility rationale for why role/label beats data-testid, readiness-wait helpers called around every interaction instead of a bare waitForTimeout(), one file per route with a deterministic route-to-class naming rule, and keeping business/domain flow logic out of page objects so multi-step flows live in a higher-level layer that composes page objects. This skill does NOT cover the browser-exploration workflow used to discover a page's interactive elements before writing the object — that stays a general-purpose, tool-agnostic concern, not owned by any skill — and it does NOT define the readiness-wait helper implementations themselves; those belong to the sibling skill ng-playwright-attribute-waits, whose helpers this skill's page objects call into. Triggers on "new page object", "Page Object Model class", "extend BasePage", "page object structure", "expand a stub page object", "locator selector priority", "role vs testid selector", "verify method pattern", "one page object per route", or "business logic leaking into a page object".
---

# ng-playwright-page-objects

## Overview

A Playwright Page Object is a typed façade over one route: it owns the
locators and the small actions/assertions that touch them, so specs read as
intent ("search, then verify the row appears") rather than raw selector
plumbing. This skill defines the **output shape** of that façade — the class
contract, the selector priority order, the wait discipline, the file/naming
rule, and the structure-vs-flow boundary. It does not define how you find the
elements to put in the class in the first place.

Populating a page object starts with discovering what's actually on the page,
and that discovery step is intentionally out of scope here: it can be done
with whatever browser-automation tooling happens to be available in the
working environment — a CLI browser-automation tool, Playwright's own MCP
tools (browser snapshot / navigate / find), a Chrome DevTools MCP
integration, or simply reading the target component's template/render output
directly are all equally valid starting points. This skill cares only about
where those discovered elements land once you've found them: as a `get`
locator accessor, a `verify*` assertion, or a small action method, following
the invariants below. No single exploration tool is required, and none is
assumed.

Two sibling skills own the pieces this one deliberately leaves out:
`ng-playwright-attribute-waits` owns the readiness-wait helper implementations
that action methods call into (invariant 3), and `ng-playwright-testid-catalog`
owns the typed catalog that `data-testid` selectors are pulled from when
they're genuinely the right choice (invariant 2).

## The 6 invariants

Create one todo per invariant. Each is independently verifiable.

1. **Baseline POM shape.** Every page object extends a shared `BasePage`
   class exposing `route`, a `navigate()` method, and a
   `constructor(page: Page)` (`references/BasePage.ts`). Locators are exposed
   as `get` accessors, not methods, so call sites read `page.searchInput`
   rather than `page.searchInput()`. Assertion methods are named `verify*`,
   return `void`, and call `expect` internally rather than returning a
   boolean for the caller to assert on. Action methods are small, composable,
   and each represents exactly one user intent. This is standard Playwright
   practice, stated once here for completeness — it is not the differentiated
   content of this skill; invariants 2 and 3 are.

2. **Selector priority: role-based first, then label/text, then
   `data-testid` from a typed catalog, then CSS class last.** Prefer
   `getByRole()` with an accessible name, then `getByLabel()`/`getByText()`,
   before reaching for `getByTestId()` — and when you do reach for it, pull
   the id from the typed catalog rather than a hand-written string (see
   sibling skill `ng-playwright-testid-catalog`). The reason testid isn't first
   choice is deliberate, not stylistic: a role/label-based selector doubles
   as a live accessibility check — if the selector can't find the element by
   its role and accessible name, that's often itself a real accessibility bug
   worth fixing, not just a flaky test. A `data-testid` selector finds the
   element regardless of whether it's exposed to assistive tech, so it
   provides no such signal and can silently paper over a missing `aria-label`
   or an unlabeled control. Reserve `data-testid` for elements that
   genuinely have no reliable accessible role or name — a bare `<div>`
   wrapping a chart, or a dynamically-keyed row identified only by an
   internal id. A CSS class selector is fragile — it breaks on any styling
   refactor that has nothing to do with the element's identity or behavior —
   and should essentially never be the first choice; reach for it only when
   every other option has been exhausted.

3. **Action methods call the sibling skill's readiness-wait helpers around
   their interactions, never a bare `waitForTimeout()`.** An action method
   that clicks, types, or navigates should await a named readiness helper
   from `ng-playwright-attribute-waits` (this skill does not define those
   helpers — see `references/BasePage.ts` for how a page object calls into
   one) rather than sleeping for a fixed duration. If a raw
   `waitForTimeout()` is genuinely unavoidable, it must carry an inline
   comment that explicitly justifies the exact millisecond budget — e.g.
   `// 400ms matches the search debounce window` — so a future reader can
   tell whether the number is still correct instead of guessing why it's
   there.

4. **One page-object file per route/page, with a deterministic,
   documented naming rule.** Derive the file path and class name from the
   route mechanically — e.g. route segments converted to PascalCase and
   suffixed `Page`, so `/items/list` becomes `ItemsListPage` in a file that
   mirrors the segment path. Group page-object files in a directory
   structure that mirrors the target app's own routing/feature
   organization, so a reader can find the object for a route by following
   the same path they'd use to find the route's own source file.

5. **Page objects encode structure, not business/domain flow.** A page
   object exposes what elements exist on its page and how to interact with
   them — it does not encode multi-step domain flows (e.g. "sign up, then
   verify the account, then complete onboarding"). Compose those flows at a
   higher-level test/flow layer that calls into one or more page objects,
   rather than embedding the flow inside a single page object's own methods.
   This keeps each page object reusable across every test flow that touches
   its page, instead of coupled to one particular scenario.

6. **A stub page object is a valid starting point; expansion is purely
   additive.** A page object containing only `route` and a page
   title/heading locator is fully compilable and a legitimate first
   commit for a new route (`references/ExampleDataTablePage.ts` shows the
   before/after). Expanding a stub with real locators, actions, and
   assertions must never break or remove the stub's original public
   `route`/title contract — only add to it — so that any spec already
   written against the stub keeps passing unmodified after the expansion.

## Red flags

- Business/domain logic (a multi-step flow) embedded inside a page object's
  own methods instead of composed by a higher-level layer calling into it.
- A `waitForTimeout()` call with no comment justifying its exact duration.
- A CSS-class selector used where a role or testid selector was available.
- An assertion method that returns a boolean instead of asserting internally
  with `expect`.
- `data-testid` used as the first-choice selector when a role or label
  selector would have worked just as well — a missed accessibility signal,
  not just a style nit.

## References

- `references/BasePage.ts` — the shared abstract base class: `route`,
  `constructor(page: Page)`, and a `navigate()` method illustrating the
  goto-then-readiness-wait pattern from invariant 3 (the actual wait helper
  import is a placeholder — that module belongs to `ng-playwright-attribute-waits`).
- `references/ExampleDataTablePage.ts` — a generic list-page example showing
  a BEFORE (stub: route + title only) and AFTER (expanded: role-based
  locator getters, a search action, a sort action, and a `verify*` assertion)
  version of the same page object, clearly labeled.
- Companion skill: `skills/ng-playwright-attribute-waits` — supplies the
  readiness helpers this skill's action methods call (invariant 3).
- Companion skill: `skills/ng-playwright-testid-catalog` — supplies the typed
  ids used as the selector-priority fallback (invariant 2) when no reliable
  role/label/text exists.

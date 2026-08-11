# ng-playwright-page-objects

Structure and selector/wait discipline for Playwright Page Object classes
targeting an Angular app: a shared `BasePage` contract, a role-first selector
priority ladder, readiness waits instead of bare timeouts, one file per
route, and a hard line between page structure and business/domain flow
logic.

## What it covers

- A shared `BasePage` class (`route`, `constructor(page: Page)`,
  `navigate()`) that every page object extends, `get` accessor locators, and
  `verify*` assertion methods that assert internally rather than returning a
  boolean.
- Selector priority — role/label first (it doubles as an accessibility
  check), `data-testid` from a typed catalog next, CSS class last and only
  as a genuine last resort.
- Action methods that call a named readiness-wait helper instead of a bare
  `waitForTimeout()`, unless a fixed wait is justified with an inline
  comment stating its exact millisecond budget.
- A deterministic route-to-class naming rule, and why a stub page object
  (route + title only) is a valid, purely-additively-expandable starting
  point.

## Use it

Read `SKILL.md` for the 6 invariants and the red flags that call them out.
Copy `references/BasePage.ts` as the shared base class for your suite, and
use `references/ExampleDataTablePage.ts` as the before/after template for
turning a stub page object into a fully-locator'd one.

## Install globally

```bash
skills add git@github.com:catesandrew/ng-starters.git --skill skills/ng-playwright-page-objects -g
```

## Companion

Pairs with a sibling skill that owns the readiness-wait helper
implementations this skill's page objects call into around their
interactions, and with another sibling skill that owns the typed
`data-testid` catalog this skill's page objects pull ids from when no
role/label selector is available. This skill only defines the page-object
class shape and selector/wait discipline that consumes those two.

// ExampleDataTablePage.ts
//
// A worked example of SKILL.md invariant 6: a stub page object is a valid,
// fully-compilable starting point, and expanding it into locators/actions/
// assertions must be purely additive — it must never break the stub's
// original public route/title contract.
//
// The target here is an Angular Material data table (`<table mat-table>`,
// a `mat-form-field` search input, and `mat-sort-header` column headers) —
// but note that nothing in this file depends on that: Playwright drives the
// rendered DOM through role/label/text locators regardless of which
// framework produced it, so the same getByRole()/getByLabel() calls below
// work unchanged against a mat-table, a plain <table>, or any other markup
// that exposes the right accessible roles and names.
//
// Both versions are shown here for reference. In a real suite you'd keep
// only the AFTER version — the BEFORE version below is commented out so
// this file stays a single, typecheck-clean compilation unit while still
// showing exactly what changed between the two.

import { expect, type Locator } from '@playwright/test'
import { BasePage } from './BasePage'

// ─────────────────────────────────────────────────────────────────────────
// BEFORE — the stub. route + a title locator, nothing else. Fully
// compilable on its own and a legitimate first commit for a new route.
// ─────────────────────────────────────────────────────────────────────────
//
// export class ItemsListPage extends BasePage {
//   readonly route = '/items'
//
//   get title(): Locator {
//     return this.page.getByRole('heading', { name: 'Items' })
//   }
// }

// ─────────────────────────────────────────────────────────────────────────
// AFTER — the same page object expanded with real locators, actions, and a
// verify* assertion. `route` and `title` are unchanged from the stub above,
// so any spec already written against the stub keeps passing unmodified.
// ─────────────────────────────────────────────────────────────────────────

export class ItemsListPage extends BasePage {
  readonly route = '/items'

  /** Unchanged from the stub — any spec written against it keeps passing. */
  get title(): Locator {
    return this.page.getByRole('heading', { name: 'Items' })
  }

  // Role-based first (invariant 2): a labeled textbox is both a reliable
  // selector and a live accessibility check — if this can't find the input
  // by role and accessible name, that's worth investigating on its own.
  // Backed here by a `mat-form-field` input, but the locator only cares
  // about the accessible role and name it renders, not the component that
  // produced it.
  get searchInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Search items' })
  }

  // Role-based: a `mat-sort-header` column button is the natural,
  // accessible sort control here — no data-testid needed.
  get nameColumnSortButton(): Locator {
    return this.page.getByRole('button', { name: 'Sort by name' })
  }

  // A dynamically-keyed row with no reliable accessible name is the kind of
  // element invariant 2 reserves data-testid for — a generic `row` role
  // works for this example, but a real mat-table with unlabeled rows would
  // pull this selector from the typed catalog (see sibling skill
  // ng-playwright-testid-catalog) instead of a CSS class.
  get rows(): Locator {
    return this.page.getByRole('row')
  }

  /**
   * Types a query into the search box and waits for the debounced results
   * to settle.
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query)
    // A bare waitForTimeout() is a red flag per invariant 3 unless it
    // carries an inline justification for the exact budget — this one
    // does: it matches this app's known search debounce window, not an
    // arbitrary guess. A real suite would prefer the sibling
    // ng-playwright-attribute-waits helper over this fallback where
    // available.
    await this.page.waitForTimeout(400) // 400ms matches the search debounce window
  }

  /** Sorts the table by the name column. */
  async sortByName(): Promise<void> {
    await this.nameColumnSortButton.click()
  }

  /**
   * Asserts the table contains a row for the given item name.
   *
   * Assertion methods are named verify*, return void, and assert
   * internally with `expect` rather than returning a boolean for the
   * caller to assert on (invariant 1).
   */
  async verifyRowVisible(itemName: string): Promise<void> {
    await expect(this.rows.filter({ hasText: itemName })).toBeVisible()
  }
}

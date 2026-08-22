---
id: usage-examples
sidebar_position: 2
---

# Usage Examples

Three worked examples spanning the `ng-playwright-*` family. Each is grounded
in the actual `references/*` code shipped with the skill — not an invented
API — so you can trace every snippet below back to its source skill.

## 1. Adding a `data-testid` via the typed catalog

Two skills work together here: **`ng-playwright-testid-catalog`** owns the
registry that generates typed, collision-checked id constants, and
**`ng-playwright-testid-attributes`** owns binding those constants onto the
component template. Say you're adding search and per-row selection to a new
"widgets" feature.

First, the catalog module (`ng-playwright-testid-catalog`, built with the
shared `createTestIdRegistry` helper — see
`skills/ng-playwright-testid-catalog/references/example-catalog.ts`):

```ts
// widgets/example-catalog.ts
import { createTestIdRegistry } from './utils'

export const WIDGETS_TEST_IDS = createTestIdRegistry({
  list: {
    page: 'widgets-list-page',
    table: 'widgets-list-table',
    searchInput: 'widgets-list-search-input',
    // Dynamic per-row id: a function, not a static string, so every row
    // gets a distinct, predictable id.
    row: (id: string) => `widgets-row-${id}`,
  },
})
```

`createTestIdRegistry` walks the object at call time and throws on any
duplicate leaf string in dev mode — so a copy-pasted id surfaces immediately
instead of silently colliding with another feature's id in production.

Then the component template binds those constants — never a literal string —
through `[attr.data-testid]`, deriving the `data-load-state`/`aria-busy` pair
from the exact signal that drives the render (`ng-playwright-testid-attributes`
invariants 1–3):

```html
<!-- widgets-list.component.html -->
<table
  [attr.data-testid]="testIds.list.table"
  [attr.data-load-state]="loadState()"
  [attr.aria-busy]="isLoading()"
>
  <tbody>
    @for (row of rows(); track row.id) {
      <tr [attr.data-testid]="testIds.list.row(row.id)">
        <td>{{ row.label }}</td>
      </tr>
    }
  </tbody>
</table>
```

Finally, a Playwright-side mirror module re-exports the identical catalog
object, so specs read `WIDGETS_TEST_IDS.list.row(id)` and can never drift
from what the app actually renders:

```ts
// e2e/widgets/example-catalog.mirror.ts
export { WIDGETS_TEST_IDS } from '../../src/widgets/example-catalog'
```

## 2. Writing a Playwright Page Object for a new route

`ng-playwright-page-objects` defines a stub-first, purely-additive shape: a
new route starts as `route` + a title locator, fully compilable, and every
later addition is purely additive so specs written against the stub keep
passing. Adding a `/items` route (see
`skills/ng-playwright-page-objects/references/ExampleDataTablePage.ts`):

```ts
// BEFORE — legitimate first commit for a new route.
export class ItemsListPage extends BasePage {
  readonly route = '/items'

  get title(): Locator {
    return this.page.getByRole('heading', { name: 'Items' })
  }
}
```

Expanding it adds locators (role-based first, per invariant 2 — a
`data-testid` selector is the fallback only when no reliable role/label
exists), an action method, and a `verify*` assertion that asserts internally
rather than returning a boolean:

```ts
// AFTER — route and title are unchanged, so the stub's contract still holds.
export class ItemsListPage extends BasePage {
  readonly route = '/items'

  get title(): Locator {
    return this.page.getByRole('heading', { name: 'Items' })
  }

  get searchInput(): Locator {
    return this.page.getByRole('textbox', { name: 'Search items' })
  }

  get rows(): Locator {
    return this.page.getByRole('row')
  }

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

  async verifyRowVisible(itemName: string): Promise<void> {
    await expect(this.rows.filter({ hasText: itemName })).toBeVisible()
  }
}
```

Every concrete page object extends the shared `BasePage` (`route`,
`constructor(page: Page)`, a `navigate()` method) from
`skills/ng-playwright-page-objects/references/BasePage.ts`, so the
goto-then-settle sequence is defined once, not per page.

## 3. Waiting on an async-loading component with the readiness helpers

`ng-playwright-attribute-waits` supplies one canonical helper module
(`skills/ng-playwright-attribute-waits/references/readiness.ts`) that every
spec and page-object method imports rather than re-deriving its own polling
loop. Consider the debounced search input from
`ng-playwright-testid-attributes`'s own reference component,
`async-data-table.component.html`, which exposes three search-pipeline
stages (`data-search-typed`/`-settled`/`-applied`) plus a combined
`data-search-state`.

:::caution Known gap between these two skills
`waitForSearchSettled` (`readiness.ts` lines 71-87) polls
`data-search-state`, `data-search-query`, and `data-search-loading` — **not**
the `data-search-typed`/`-settled`/`-applied` trio the async data table
component above actually emits. `data-search-query` and `data-search-loading`
aren't produced by any component under `skills/` today. Calling
`waitForSearchSettled` against `async-data-table.component.html` as written
will time out waiting for attributes that don't exist — this is a real
mismatch between the two skills, tracked as a bug, not something papered
over with an invented API below.
:::

The snippet below is honest about that gap: it shows exactly what the helper
polls today, so it type-checks against the real implementation, but it does
**not** claim this passes against the async data table shown above:

```ts
import { waitForSearchSettled, waitForReady } from './readiness'

test('waits for the search state machine to settle', async ({ page }) => {
  const search = page.getByTestId('async-data-table-search')

  await search.fill('drill')

  // waitForSearchSettled's REAL poll target (readiness.ts lines 78-86) is
  // data-search-state / data-search-query / data-search-loading — attributes
  // this skill's own async-data-table component does not emit (it emits
  // data-search-typed/-settled/-applied/-state instead). See the callout
  // above; this call will time out until that gap is closed.
  await waitForSearchSettled(search, { state: 'ready', query: 'drill' })

  await waitForReady(page.getByTestId('async-data-table'))
})
```

For a repeatable destructive action — refreshing the item-details modal from
`ng-playwright-testid-attributes`'s `async-details-modal.component.html`,
say — pair `waitForEpochAdvance` with a structural assertion rather than
trusting a terminal state string alone, since a string like `"ready"` can
repeat identically across two separate action cycles. The modal is the
component that actually carries `data-refresh-epoch`:

```ts
import { waitForEpochAdvance, waitForReady } from './readiness'

test('refreshing the item details modal advances its epoch', async ({ page }) => {
  const modal = page.getByTestId('item-details-modal')
  const before = Number(await modal.getAttribute('data-refresh-epoch'))

  await page.getByRole('button', { name: 'Refresh' }).click()

  await waitForEpochAdvance(modal, 'data-refresh-epoch', before)
  // Pair the epoch check with its own structural assertion — a repeated
  // "ready" load-state string alone can't distinguish this refresh cycle
  // from the one before it.
  await waitForReady(modal)
})
```

See [Architecture](./architecture) for how these four skills fit together as
a distribution pipeline, or the [Skills catalog](./skills) for a page per
skill with its full invariant list.

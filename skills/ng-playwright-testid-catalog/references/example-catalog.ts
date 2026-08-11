import { createTestIdRegistry } from './utils'

/**
 * Example catalog for a generic "widgets" feature area. Keys are nested by
 * view/section (list/detail/create/edit/dialogs) with element suffixes
 * (-page/-button/-input/-table/-row) documenting what DOM role each id
 * targets. Dynamic per-row ids are exposed as functions, not static
 * strings, so every row gets a distinct, predictable id (see `row`).
 */
export const WIDGETS_TEST_IDS = createTestIdRegistry({
  list: {
    page: 'widgets-list-page',
    table: 'widgets-list-table',
    createButton: 'widgets-list-create-button',
    searchInput: 'widgets-list-search-input',
    /**
     * Dynamic per-row id, `prefix-${id}` convention. Always construct this
     * from the known widget id — never hardcode a specific row's id in a
     * spec.
     */
    row: (id: string) => `widgets-row-${id}`,
  },
  detail: {
    page: 'widgets-detail-page',
    editButton: 'widgets-detail-edit-button',
    deleteButton: 'widgets-detail-delete-button',
  },
  create: {
    page: 'widgets-create-page',
    nameInput: 'widgets-create-name-input',
    submitButton: 'widgets-create-submit-button',
  },
  edit: {
    page: 'widgets-edit-page',
    nameInput: 'widgets-edit-name-input',
    saveButton: 'widgets-edit-save-button',
  },
  dialogs: {
    confirmDelete: {
      dialog: 'widgets-confirm-delete-dialog',
      confirmButton: 'widgets-confirm-delete-confirm-button',
      cancelButton: 'widgets-confirm-delete-cancel-button',
    },
  },
})

/**
 * Reverse-parse fallback: recovers a widget id from a harvested list of
 * rendered `data-testid` attributes. Last resort for debugging or
 * migration — specs should construct ids via `WIDGETS_TEST_IDS.list.row(id)`
 * instead of parsing them back out of the DOM.
 */
const ROW_ID_PATTERN = /^widgets-row-(.+)$/

export function parseWidgetRowId(testId: string): string | null {
  const match = ROW_ID_PATTERN.exec(testId)
  return match ? match[1] : null
}

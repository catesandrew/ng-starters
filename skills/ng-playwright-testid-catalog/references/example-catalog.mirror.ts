/**
 * Playwright-side mirror of the widgets catalog.
 *
 * A straight re-export is the simplest correct option here: the catalog
 * module (`example-catalog.ts`) has no browser-only or server-only
 * dependencies, so importing it directly from spec/page-object code is
 * safe and keeps app and test code reading the exact same object — zero
 * string duplication, and a rename breaks this import at compile time
 * instead of leaving a stale string alive in a spec.
 *
 * If a real catalog module ever pulls in app-only dependencies (a
 * server-only import, a bundler alias Playwright's runner can't resolve),
 * switch this to a dynamic import at the point of use instead:
 *
 *   const { WIDGETS_TEST_IDS } = await import('../../src/widgets/example-catalog')
 *
 * That defers resolution to runtime and avoids pulling the app-only
 * dependency into the Playwright config's module graph at load time.
 */
export { WIDGETS_TEST_IDS, parseWidgetRowId } from './example-catalog'

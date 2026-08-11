import { expect, type Locator, type Page } from '@playwright/test'

export interface WaitOptions {
  timeout?: number
}

const DEFAULT_TIMEOUT = 10_000

/**
 * Load-state gate (invariant 2). Checks the negative case FIRST — that the
 * element never surfaced a transient error flash — before asserting the
 * positive "ready" state. Checking only the positive case can pass even when
 * the UI briefly errored before recovering, because by the time the
 * assertion runs the attribute may already read "ready".
 */
export async function waitForReady(locator: Locator, opts: WaitOptions = {}): Promise<void> {
  const timeout = opts.timeout ?? DEFAULT_TIMEOUT
  await expect(locator).not.toHaveAttribute('data-load-state', 'error', { timeout })
  await expect(locator).toHaveAttribute('data-load-state', 'ready', { timeout })
}

/**
 * Close/unmount gate (invariant 3). Prefers the documented "closed" attribute
 * value over `toBeHidden()` alone — an element can be hidden for many
 * transient reasons that have nothing to do with the intended close/unmount
 * having actually finished. Falls back to a visibility-only check for
 * older/uninstrumented components that don't expose the attribute yet
 * (invariant 8's degrade-gracefully rule, applied here).
 */
export async function waitForClosed(locator: Locator, opts: WaitOptions = {}): Promise<void> {
  const timeout = opts.timeout ?? DEFAULT_TIMEOUT
  const attr = await locator.getAttribute('data-open-state').catch(() => null)
  if (attr === null) {
    // Uninstrumented component: fall back to a coarser visibility wait
    // instead of hard-throwing because the attribute isn't present.
    await locator.waitFor({ state: 'hidden', timeout })
    return
  }
  await expect(locator).toHaveAttribute('data-open-state', 'closed', { timeout })
}

/**
 * Epoch-fencing (invariant 4). Capture `fromEpoch` BEFORE triggering the
 * action, then poll until the attribute's numeric value is strictly greater.
 * Callers wrapping a destructive action should additionally assert the
 * expected structural side effect (e.g. a row is gone) rather than trusting
 * the epoch alone — pair this with your own structural assertion when the
 * triggered action is destructive.
 */
export async function waitForEpochAdvance(
  locator: Locator,
  attr: string,
  fromEpoch: number,
  opts: WaitOptions = {},
): Promise<void> {
  const timeout = opts.timeout ?? DEFAULT_TIMEOUT
  await expect
    .poll(async () => {
      const raw = await locator.getAttribute(attr)
      return raw === null ? Number.NaN : Number(raw)
    }, { timeout })
    .toBeGreaterThan(fromEpoch)
}

/**
 * Search-settle (invariant 5). Polls ALL tracked search-pipeline attributes
 * together in one combined assertion rather than checking them one at a
 * time — a partial check can pass while a sibling attribute still lags the
 * just-typed query, a well-known source of flaky search-test failures.
 */
export async function waitForSearchSettled(
  locator: Locator,
  expected: { state: string; query: string },
  opts: WaitOptions = {},
): Promise<void> {
  const timeout = opts.timeout ?? DEFAULT_TIMEOUT
  await expect
    .poll(async () => {
      const [state, query, loading] = await Promise.all([
        locator.getAttribute('data-search-state'),
        locator.getAttribute('data-search-query'),
        locator.getAttribute('data-search-loading'),
      ])
      return { state, query, loading }
    }, { timeout })
    .toEqual({ state: expected.state, query: expected.query, loading: 'false' })
}

/**
 * Guarded JSON parse for attribute-embedded data (invariant 6). Never assume
 * an attribute is well-formed JSON. Combine with a shape guard at the
 * call site (e.g. `Array.isArray`), and when a hidden-sentinel copy of the
 * same JSON attribute also exists on the page, call this on both and union
 * the results rather than trusting whichever one happens to be read first.
 */
export function parseAttributeJson<T>(raw: string | null): T | undefined {
  if (raw === null) return undefined
  try {
    return JSON.parse(raw) as T
  } catch {
    return undefined
  }
}

/**
 * Degrade-gracefully fallback (invariant 8) for suites that want a
 * page-level settle point when no per-element attribute applies — e.g.
 * waiting out a legacy page's network activity instead of hard-throwing
 * because expected attributes aren't present anywhere on it yet.
 */
export async function waitForPageSettled(page: Page, opts: WaitOptions = {}): Promise<void> {
  const timeout = opts.timeout ?? DEFAULT_TIMEOUT
  await page.waitForLoadState('networkidle', { timeout })
}

// ---------------------------------------------------------------------------
// Invariant 1: exactly ONE canonical helper module.
//
// WRONG — a second spec file re-derives its own polling loop instead of
// importing the shared helper above. It looks harmless in isolation, but it
// now silently drifts from this module the next time the load-state
// contract changes:
//
//   // some-other.spec.ts
//   async function waitUntilReady(locator: Locator) {
//     for (let i = 0; i < 20; i++) {
//       const state = await locator.getAttribute('data-load-state')
//       if (state === 'ready') return
//       await new Promise((resolve) => setTimeout(resolve, 250))
//     }
//     throw new Error('timed out waiting for ready')
//   }
//
// RIGHT — import the canonical helper instead of reimplementing it:
//
//   import { waitForReady } from './readiness'
//   await waitForReady(page.getByTestId('widget'))

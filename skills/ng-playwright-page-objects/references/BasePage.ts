// BasePage.ts
//
// The shared base class every page object in the suite extends. It owns the
// one piece of contract common to every page — the route, the constructor
// shape, and the navigate-then-settle sequence — so individual page objects
// stay focused on their own locators, actions, and assertions (SKILL.md
// invariant 1).
//
// The readiness-wait helper imported below is a PLACEHOLDER. This skill
// does not define readiness-wait implementations — that module belongs to
// the sibling skill `ng-playwright-attribute-waits`, whose helpers this
// skill's page objects call into (SKILL.md invariant 3). Point the import
// at wherever that helper actually lives in your suite.
import type { Page } from '@playwright/test'
// import { waitForReady } from '../waits/waitForReady' // placeholder — owned by ng-playwright-attribute-waits

export abstract class BasePage {
  /**
   * The route this page object represents, relative to the app's base URL
   * (e.g. `/items`). Every concrete page object must set this.
   */
  abstract readonly route: string

  constructor(protected readonly page: Page) {}

  /**
   * Navigates to this page's route and waits for it to settle before
   * returning control to the caller.
   *
   * The settle wait is deliberately delegated to a named readiness helper
   * rather than a bare `page.waitForTimeout()` — see SKILL.md invariant 3.
   * `waitForLoadState('networkidle')` below is a reasonable default settle
   * signal until a project-specific readiness helper is wired in; swap it
   * for the real helper import once `ng-playwright-attribute-waits` is
   * available in this suite.
   */
  async navigate(): Promise<void> {
    await this.page.goto(this.route)
    // await waitForReady(this.page) // placeholder — see ng-playwright-attribute-waits
    await this.page.waitForLoadState('networkidle')
  }
}

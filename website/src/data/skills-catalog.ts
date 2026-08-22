/**
 * The ng-starters skills catalog.
 *
 * Single source of truth for the summary table on `/docs/skills` and for
 * any other page that wants to list every skill without hardcoding names.
 * Adding a 5th skill family means appending one entry here — no other file
 * needs to enumerate skill names.
 */
export interface SkillCatalogEntry {
  /** Skill name, matching the `skills/<name>/` directory and SKILL.md frontmatter. */
  name: string;
  /** Doc slug under `/docs/skills/<slug>`. */
  slug: string;
  /** One human-readable sentence: what the skill does. */
  purpose: string;
  /** One human-readable sentence: when to reach for it. */
  useCase: string;
}

export const skillsCatalog: SkillCatalogEntry[] = [
  {
    name: 'ng-playwright-testid-attributes',
    slug: 'ng-playwright-testid-attributes',
    purpose:
      'Instruments Angular components (modals, drawers, async data tables) with data-*/aria-* attributes bound to the exact Signal driving their render, so their async and visual state is trustworthy for Playwright to assert on.',
    useCase:
      'Reach for it when authoring or editing a component whose visible content depends on async loading or mutation state and it needs to be reliably testable — e.g. adding data-load-state and aria-busy to a new async modal.',
  },
  {
    name: 'ng-playwright-testid-catalog',
    slug: 'ng-playwright-testid-catalog',
    purpose:
      'Builds one typed data-testid registry per feature area with a Playwright-side mirror module, so app code and spec code can never drift apart on an id string.',
    useCase:
      'Reach for it when adding data-testid attributes for a new feature area, or migrating scattered hardcoded testid strings into a single typed catalog.',
  },
  {
    name: 'ng-playwright-page-objects',
    slug: 'ng-playwright-page-objects',
    purpose:
      'Defines the class structure and selector/wait discipline for Playwright Page Object classes: a shared BasePage contract, get-accessor locators, verify* assertions, and a role-then-label-then-testid-then-CSS selector priority ladder.',
    useCase:
      'Reach for it when creating a new Page Object class, or expanding a stub one into a fully-locator\'d, action-bearing page object.',
  },
  {
    name: 'ng-playwright-attribute-waits',
    slug: 'ng-playwright-attribute-waits',
    purpose:
      'Supplies one canonical module of readiness-wait helpers — waitForReady, waitForClosed, waitForEpochAdvance, waitForSearchSettled — for polling data-*/aria-* state correctly instead of guessing with waitForTimeout.',
    useCase:
      'Reach for it when writing or updating a Playwright spec or page-object method that must wait on async UI state before asserting against or interacting with the page.',
  },
];

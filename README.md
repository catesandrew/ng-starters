# ng-starters

**Tags:** `skills` `monorepo`

**Angular Playwright testing, minus the flaky waits and the copy-pasted
selectors.** `ng-starters` is a family of Claude Code skills that turns
"write a `data-testid`, cross your fingers, add a `waitForTimeout`" into a
disciplined, typed, repeatable workflow — attribute instrumentation, a
collision-checked testid catalog, Page Object structure, and correct
attribute-based waits, all wired together. Grounding depth varies by skill:
where Angular's model actually differs from React's — signals, `[attr.*]`
bindings, `@if`-unmount semantics — each skill was re-derived against real
Angular 21+ source rather than assumed from its `next-starters` React
counterpart; where the underlying mechanics are framework-agnostic (e.g. the
testid registry/mirror logic, which is plain TypeScript), they were ported
unchanged and only the component-binding illustration was adapted. Full docs
(architecture, usage examples,
per-skill deep dives) are live at
[ng-starters.catesworks.dev](https://ng-starters.catesworks.dev).

A sibling repo to [`next-starters`](../next-starters), housing a family of
global Claude Code skills for Playwright-testing **Angular 21+** applications.

## Purpose

`next-starters` ships a `playwright-*` family of skills targeting Next.js/React
apps. This repo ports that same testing methodology to Angular, as the
`ng-playwright-*` family:

- `ng-playwright-testid-attributes`
- `ng-playwright-testid-catalog`
- `ng-playwright-page-objects`
- `ng-playwright-attribute-waits`

Each skill mirrors the intent of its `next-starters` counterpart while
adapting to Angular's component model, template syntax, and idioms (signals,
directives, standalone components, etc.) rather than React/JSX.

## Relationship to next-starters

`next-starters` is a broader-scope starter-kit generator (a `create-client`
/ `add-api-client` scaffold CLI) with its own history, docs, and templates.
`ng-starters` is intentionally narrow: it exists solely to house this one
family of four Playwright-testing skills for Angular. It does not scaffold
projects, generate clients, or share tooling with `next-starters` beyond
being ported from the same skill methodology.

## Status

All four `ng-playwright-*` skills are present under `skills/`, each ported
from its `next-starters` counterpart. `ng-playwright-testid-attributes`
carries file:line citations to a live Angular 21+ codebase in its
`SKILL.md`; the other three encode invariants without external citations,
since their core mechanics are framework-agnostic. Not yet installed
globally — see each skill's `README.md` for the install command.

## Skills Catalog

This list grows over time as new skill families are added — treat it as a
living index, not a fixed set of four.

| Name | Purpose | Use Case |
| --- | --- | --- |
| `ng-playwright-testid-attributes` | Instruments Angular components (modals, drawers, async data tables) with data-\*/aria-\* attributes bound to the exact Signal driving their render, so their async and visual state is trustworthy for Playwright to assert on. | Reach for it when authoring or editing a component whose visible content depends on async loading or mutation state and it needs to be reliably testable — e.g. adding data-load-state and aria-busy to a new async modal. |
| `ng-playwright-testid-catalog` | Builds one typed data-testid registry per feature area with a Playwright-side mirror module, so app code and spec code can never drift apart on an id string. | Reach for it when adding data-testid attributes for a new feature area, or migrating scattered hardcoded testid strings into a single typed catalog. |
| `ng-playwright-page-objects` | Defines the class structure and selector/wait discipline for Playwright Page Object classes: a shared BasePage contract, get-accessor locators, verify\* assertions, and a role-then-label-then-testid-then-CSS selector priority ladder. | Reach for it when creating a new Page Object class, or expanding a stub one into a fully-locator'd, action-bearing page object. |
| `ng-playwright-attribute-waits` | Supplies one canonical module of readiness-wait helpers — waitForReady, waitForClosed, waitForEpochAdvance, waitForSearchSettled — for polling data-\*/aria-\* state correctly instead of guessing with waitForTimeout. | Reach for it when writing or updating a Playwright spec or page-object method that must wait on async UI state before asserting against or interacting with the page. |

## Alternative Installation Methods

<details>
<summary><b>Vercel Skills CLI</b></summary>

Install one or more skills directly from this repo with the
[Vercel Skills CLI](https://www.npmjs.com/package/skills), globally so any
project can use them:

```bash
skills add git@github.com:catesandrew/ng-starters.git --skill skills/ng-playwright-testid-attributes -g
skills add git@github.com:catesandrew/ng-starters.git --skill skills/ng-playwright-testid-catalog -g
skills add git@github.com:catesandrew/ng-starters.git --skill skills/ng-playwright-page-objects -g
skills add git@github.com:catesandrew/ng-starters.git --skill skills/ng-playwright-attribute-waits -g
```

Pick just the skill(s) you want — each `--skill` path is independent, so
drop the ones you don't need. Omit `-g` to install into the current project
instead of globally.

</details>

<details>
<summary><b>npm package install</b></summary>

Each skill also publishes as a standalone npm package under
`@ng-starters/skill-ng-playwright-*`:

```bash
pnpm add -D @ng-starters/skill-ng-playwright-testid-attributes
pnpm add -D @ng-starters/skill-ng-playwright-testid-catalog
pnpm add -D @ng-starters/skill-ng-playwright-page-objects
pnpm add -D @ng-starters/skill-ng-playwright-attribute-waits
# or npm install --save-dev <package-name>
```

npm only lands the files in `node_modules/` — it doesn't wire them into
Claude's skill lookup path. Copy the installed package into your project's
skills directory afterward:

```bash
cp -r node_modules/@ng-starters/skill-ng-playwright-page-objects .claude/skills/ng-playwright-page-objects
```

</details>

<details>
<summary><b>Claude Code Plugin marketplace</b></summary>

This repo is registered as a Claude Code plugin marketplace. Add it once,
then install the `ng` plugin, which bundles all four skills:

```
/plugin marketplace add catesandrew/ng-starters
/plugin install ng@ng-starters
```

</details>

<details>
<summary><b>git clone</b></summary>

Plain manual copy, no tooling required:

```bash
git clone git@github.com:catesandrew/ng-starters.git
cp -r ng-starters/skills/ng-playwright-page-objects /path/to/your/project/.claude/skills/
```

Repeat the `cp` for any other skill directory under `skills/` you want.

</details>

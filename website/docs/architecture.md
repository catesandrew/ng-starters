---
id: architecture
sidebar_position: 3
---

# Architecture

`ng-starters` is intentionally narrow: it exists to house one family of four
Playwright-testing skills for Angular, published through three independent
distribution channels off a single source of truth. This page covers the
repo layout, how the release pipeline keeps those three channels in sync,
the changesets release flow, and the architect-review pass that grounds the
skills' credibility story.

## Repo layout

```
ng-starters/
├── skills/                    source of truth — tracked in git
│   └── ng-playwright-<name>/
│       ├── SKILL.md           invariants + trigger-phrase description
│       ├── metadata.json      version, references list, abstract
│       ├── README.md          per-skill install instructions
│       └── references/        example components, helpers, page objects
├── packages/                  partially gitignored, generated — npm publish units
│   └── skill-ng-playwright-<name>/
│       └── package.json       kept in sync with skills/<name>/metadata.json
│                               (package.json + CHANGELOG.md are the only
│                               tracked files per package; see below)
├── bin/                       the sync/validate/generate pipeline (below)
├── .claude-plugin/
│   └── marketplace.json       generated plugin listing, all 4 skill paths
├── .changeset/                changesets config + pending change files
├── .github/workflows/
│   └── skills-release.yml     verify (PR) / release (main) split
└── website/                   this Docusaurus site — standalone, not a
                                pnpm-workspace member, no relationship to
                                the skill-package publish pipeline
```

`website/` is deliberately excluded from `pnpm-workspace.yaml`'s
`packages/skill-*` glob — it ships to Vercel on its own, unrelated to the
skill-publish pipeline described below.

## The three distribution channels

Every channel reads from (or is generated from) `skills/<name>/` — nothing
is hand-maintained in more than one place.

```
                     skills/<name>/
              (SKILL.md, metadata.json, references/)
                    source of truth
                          │
        ┌─────────────────┼─────────────────────┐
        │                 │                      │
        ▼                 ▼                      ▼
  1. git-based       2. npm package        3. plugin marketplace
  skill install      packages/skill-<name>/  .claude-plugin/
                                              marketplace.json
  `skills add        `pnpm add -D           `/plugin marketplace add`
   git@...           @ng-starters/skill-…`  `/plugin install ng@…`
   --skill
   skills/<name>`
```

1. **Git-based install** — the Claude Code Skill tool (or the Vercel Skills
   CLI's `skills add`) reads `skills/<name>/` directly out of this repo. No
   build step; it's exactly what's tracked in git.

2. **npm packages** — `packages/skill-<name>/` is partially gitignored —
   `packages/.gitignore` excludes `skill-*/*` wholesale, then negates
   `!skill-*/package.json` and `!skill-*/CHANGELOG.md`, so those two files
   per skill are tracked in git while the rest is generated — by four
   scripts run in sequence:
   - **`bin/generate-skill-package-json.mjs`** keeps
     `packages/skill-<name>/package.json` in sync with
     `skills/<name>/metadata.json`. Packages default `private: true`;
     `docs/published-skills.json` is the publish allowlist.
   - **`bin/sync-skill-content.mjs`** mirrors tracked content from
     `skills/<name>/` into `packages/skill-<name>/`, pruning stale files, and
     defensively renames any `.gitignore`/`.npmignore` it finds inside so
     npm's packer can't silently drop content.
   - **`bin/validate-skill-package.mjs`** runs `pnpm pack --dry-run --json`
     (not `npm pack` — this workspace uses pnpm + changesets for publishing)
     and asserts every `metadata.json.references` entry resolves to a real
     packed file, and that `metadata.json.version` matches
     `package.json.version`.
   - **`bin/sync-metadata-version.mjs`** writes each package's current
     version back into `skills/<name>/metadata.json.version`. It runs as
     part of the changesets `version-packages` script, before packing.

3. **Claude Code plugin marketplace** — **`bin/generate-marketplace.mjs
   --prefix ng`** generates `.claude-plugin/marketplace.json`: a single
   plugin (`ng`) listing all four skill paths. It deliberately carries no
   per-skill version field, so it never needs reconciling with a Version
   PR's version bumps.

## Release pipeline (`.github/workflows/skills-release.yml`)

The workflow splits into a **verify** job (every PR) and a **release** job
(every push to `main`):

- **`verify`** re-runs generate → sync → validate → generate-marketplace and
  asserts `git diff --exit-code` — CI fails if the generated
  `packages/*`/`marketplace.json` output has drifted from `skills/*`. This is
  the mechanism that keeps all three channels honest: nothing generated is
  allowed to silently fall out of sync with the source of truth.
- **`release`** runs `changesets/action@v1`, which opens or updates a Version
  PR (`pnpm run version-packages`, gated to always run) and, once that PR is
  merged, publishes (`pnpm run release`) — but only when `NPM_TOKEN` is
  configured. The workflow computes an empty publish input otherwise, so the
  Version PR flow keeps working even before publishing credentials exist.
- `pnpm run release` chains: `generate-skill-package-json.mjs --check` →
  `sync-skill-content.mjs --all` → `validate-skill-package.mjs --all` →
  `changeset publish`.
- **Recovery note:** a partial `changeset publish` failure is safe to retry —
  changesets skips already-published versions via its own registry diff, so
  recovery is just re-running the job.

## How the skills got here — and how they were checked

The four `ng-playwright-*` skills weren't a uniform find-and-replace port of
`next-starters`' React `playwright-*` family, though grounding depth varied
per skill. Commit `f012bc9` re-derived `ng-playwright-testid-attributes`'
Angular-specific parts against a real, live Angular 21.1.2 codebase
(referred to internally as "arcos-web," using a component library called
"Pinnacle") — Signal-driven `[attr.*]` template bindings, `modal-popup`'s
actual unmount behavior, real epoch-counter and debounce precedents — with
file:line citations backing each invariant in that skill's own `SKILL.md`,
rather than assuming the React version's patterns would translate
unchanged. The other three skills (`ng-playwright-testid-catalog`,
`ng-playwright-page-objects`, `ng-playwright-attribute-waits`) encode their
invariants without external file:line citations — their core mechanics are
largely framework-agnostic, so `ng-playwright-testid-catalog`'s own
`metadata.json` abstract says plainly that its registry/mirror logic was
carried over unchanged from the React original, and only the component-binding
illustration was adapted to Angular's `[attr.data-testid]` syntax.

That grounding was then independently checked. A follow-up architect review
(commit `ca86d59`) caught concrete errors that had slipped through the first
pass:

- **`ng-playwright-testid-attributes`**: a sentinel-placement code comment in
  `async-details-modal.component.html` contradicted what the example
  actually demonstrated — fixed by adding a real consumer-sibling-sentinel
  example.
- **`ng-playwright-testid-attributes`**: `async-data-table.component.html`
  had four hand-written `data-testid` literals that violated the skill's own
  invariant 8 (testids must come from a typed catalog) — fixed by routing
  them through a mock `TESTIDS` catalog.
- **`ng-playwright-attribute-waits`**: a dangling reference to a
  `docs/LOCAL-DEV-RUNBOOK.md` and `pnpm-dev`/`process-compose`, inherited
  from the `next-starters` original, pointed at tooling this repo doesn't
  have — retargeted to `nx serve`.
- **`ng-playwright-page-objects`**: `ExampleDataTablePage.ts` had been framed
  around Angular Material, but the real source codebase declares
  `@angular/material` as a dependency without actually using it — retargeted
  to Pinnacle's actual `lib-table`.
- Minor citation-accuracy fixes: a wrong line number in `cmdk.component.ts`,
  a wrong `@if`-usage count (72/143 vs. the actual 73/142), and an uncited
  "typeahead" claim dropped from `metadata.json`'s abstract.

The takeaway for anyone evaluating these skills: "why was this created" isn't
just "we needed Angular skills" — it's "we needed skills whose claims are
independently verifiable against real code," and the review pass that caught
and fixed these errors is part of the skills' credibility story, not
something to gloss over.

## Multi-channel rollout, in one sentence

Commit `8c7ad67` rolled out all three channels via `next-starters`' own
`skill-channel-rollout` skill, scoped to `@ng-starters` with plugin prefix
`ng`; a same-day follow-up (`8c5099f`) fixed a repo-relative reference-path
bug the rollout's own validator caught (`bin/validate-skill-package.mjs`
surfaced it, but fixing it was a deliberate human judgment call per skill,
not an auto-fix) before enabling all four skills for publish.

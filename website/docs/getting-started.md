---
id: getting-started
sidebar_position: 1
---

# Getting Started

`ng-starters` ships four Claude Code skills — the `ng-playwright-*` family —
that instrument, catalog, page-object, and wait-on Angular UI state for
Playwright tests. There's no framework to install and no config to write:
each skill is a self-contained `SKILL.md` + `references/` bundle that Claude
Code reads directly once it's on the skill lookup path. Pick whichever of the
four channels below fits how your project already manages dependencies.

## Install: Vercel Skills CLI

The [Vercel Skills CLI](https://www.npmjs.com/package/skills) installs
straight from this git repo, one skill (or all four) at a time:

```bash
skills add git@github.com:catesandrew/ng-starters.git --skill skills/ng-playwright-testid-attributes -g
skills add git@github.com:catesandrew/ng-starters.git --skill skills/ng-playwright-testid-catalog -g
skills add git@github.com:catesandrew/ng-starters.git --skill skills/ng-playwright-page-objects -g
skills add git@github.com:catesandrew/ng-starters.git --skill skills/ng-playwright-attribute-waits -g
```

Each `--skill` path is independent — drop the lines for skills you don't
need. Omit `-g` to install into the current project instead of globally.

## Install: npm package

Each skill also publishes as a standalone package under
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

## Install: Claude Code plugin marketplace

This repo is registered as a Claude Code plugin marketplace. Add it once,
then install the `ng` plugin, which bundles all four skills together:

```
/plugin marketplace add catesandrew/ng-starters
/plugin install ng@ng-starters
```

## Install: git clone

Plain manual copy, no tooling required:

```bash
git clone git@github.com:catesandrew/ng-starters.git
cp -r ng-starters/skills/ng-playwright-page-objects /path/to/your/project/.claude/skills/
```

Repeat the `cp` for any other skill directory under `skills/` you want.

## First use

Skills aren't invoked by name — Claude Code reads each installed skill's
`SKILL.md` frontmatter `description` and auto-activates the skill whenever
your request matches one of its trigger phrases. There's no slash command to
memorize; you just describe the task.

A few examples of prompts that activate each skill, straight from their own
frontmatter:

- *"Add a `data-testid` to this Angular component"* or *"make this modal
  Playwright-testable"* → activates **`ng-playwright-testid-attributes`**.
- *"Set up a `data-testid` catalog for this feature"* or *"migrate hardcoded
  testid strings into a typed catalog"* → activates
  **`ng-playwright-testid-catalog`**.
- *"Create a new Page Object for this route"* or *"expand this stub page
  object"* → activates **`ng-playwright-page-objects`**.
- *"This Playwright test is flaky, help me wait for the modal to close"* or
  *"add epoch fencing to this retry test"* → activates
  **`ng-playwright-attribute-waits`**.

Once a skill activates, Claude Code follows its invariants — the numbered
rules in each `SKILL.md` — and cites the same `references/*` files this site
draws its examples from. See [Usage Examples](./usage-examples) for three
worked walkthroughs, or [Architecture](./architecture) for how the skills
are built and distributed.

# Design: ng-starters documentation site, README overhaul, skills catalog

Date: 2026-08-22

## Problem

`ng-starters` has no onboarding surface. Anyone landing on the repo has to
read `SKILL.md` frontmatter across four directories to answer "how do I use
this," "how does it run," and "where are the setup instructions." The repo
will grow beyond the current four `ng-playwright-*` skills, so the answer
needs to scale past a single README section.

## Goals

- A hosted Docusaurus site (`ng-starters.catesdev.sh`, via Vercel) that
  explains architecture, usage, and installation, with enough "why should I
  care" energy that a visitor wants to install immediately.
- A skills catalog: one summary table (name / purpose / use case) covering
  every skill, plus one deep page per skill covering what it does, why it
  was created, and how to use it — designed to gain rows/pages as new skill
  families are added, not hardcoded to the current four.
- A README that keeps its existing technical detail but gains a promo
  section, the skills table, and an "Alternative Installation Methods"
  block (git-based `skills add`, npm package, Claude Code plugin
  marketplace) modeled on the `modern-web-guidance` README pattern.

## Non-goals

- Docs versioning (single unversioned tree — repo is 0.1.0, four skills).
- Auto-generating catalog page content from `SKILL.md` frontmatter (catalog
  table is a small hand-maintained data file; per-skill pages are hand-written
  prose, not templated).
- Algolia search (local build-time search plugin instead — no external
  account dependency).

## Site architecture

- New top-level `website/` directory: standalone Docusaurus 3 + TypeScript
  app with its own `package.json`. **Not** added to the `pnpm-workspace.yaml`
  glob (`packages/skill-*`) — it has no relationship to the skill-package
  publish pipeline and doesn't need to.
- Custom theme: brand colors/typography, not the default classic Docusaurus
  look. No dark/light-mode scope decision needed — Docusaurus ships both by
  default; theme customization applies to both.
- `@easyops-cn/docusaurus-search-local` for local, build-time search.
- Single unversioned doc set (no `versioned_docs/`).

## Information architecture

- `/` — landing page. Hero, tagline, "why this exists" pitch with bold
  marketing tone (explicit contrast: hand-rolled/flaky Playwright setup vs.
  skill-driven testid/wait/page-object discipline), quick-install snippet,
  CTA into `/docs/getting-started`.
- `/docs/getting-started` — install via all three channels (git-based
  `skills add`, npm package, Claude Code plugin marketplace), first-use
  walkthrough.
- `/docs/usage-examples` — a handful of worked examples spanning the skill
  family (e.g., adding a testid catalog entry for a new feature, writing a
  page object from a stub, wiring a debounced-search wait).
- `/docs/architecture` — deep dive: repo layout, the three-channel
  distribution model (pnpm workspace / npm packages / plugin marketplace),
  the `bin/*.mjs` release pipeline, the changesets release flow, diagrams.
- `/docs/skills/` — catalog index: one table (name, purpose, use case)
  driven by a small hand-maintained data file (e.g.
  `website/src/data/skills-catalog.ts`) that new skill families get appended
  to; the table itself is generic over N rows, not a fixed four.
- `/docs/skills/<skill-name>` — one hand-written page per skill: what it
  does, why it was created, how to use it, related/companion skills. "Why it
  was created" content is sourced from `git log`, `SKILL.md`/`metadata.json`,
  and prior Claude Code session transcripts identified during brainstorming
  (notably a `cars`-repo session documenting invariant-grounding work behind
  `ng-playwright-testid-attributes`, and a bootstrap/deepinit session behind
  the initial four-skill scaffold) — this research happens per-skill during
  implementation, not templated.

## README changes

Keep all existing technical content (purpose, relationship to
`next-starters`, status). Add on top:

- A short promo blurb near the top (not a full rewrite).
- The same skills catalog table used on the docs site.
- An "Alternative Installation Methods" collapsible section, structurally
  modeled on `modern-web-guidance`'s README (`<details><summary>` blocks per
  install method): Vercel Skills CLI (`npx skills add`), npm package
  install, Claude Code plugin marketplace, git clone.

## Deployment

Use the connected Vercel MCP tool to create a project rooted at `website/`,
connect it to this repo, deploy, and attach the custom domain
`ng-starters.catesdev.sh`. DNS-side CNAME confirmation on `catesdev.sh` is
the user's responsibility once Vercel returns the target record.

## Risks / open questions

- Per-skill "why" research quality depends on transcript search coverage —
  if a skill has no session history hits, the page falls back to git log +
  `SKILL.md` only, and should say so rather than fabricate a narrative.
- Custom theme scope (how far from Docusaurus defaults) is intentionally
  left to implementation-time judgment within "fully custom, not default
  classic" — no pixel-level spec here.

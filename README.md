# ng-starters

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

This is the bootstrap commit. `skills/` is currently empty; each of the four
`ng-playwright-*` skills above will be added in a subsequent change.

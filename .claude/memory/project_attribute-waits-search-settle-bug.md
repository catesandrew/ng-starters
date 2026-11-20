---
name: attribute-waits-search-settle-bug
description: Known contract bug in published ng-playwright-attribute-waits skill — waitForSearchSettled polls attributes no shipped component emits
metadata: 
  node_type: memory
  type: project
  originSessionId: 3b68276b-06ea-41b0-96df-cc169e5bd5bb
  modified: 2026-09-06T14:15:24.985Z
---

`waitForSearchSettled` in `skills/ng-playwright-attribute-waits/references/readiness.ts`
(lines ~71-87, poll body ~78-86) polls `data-search-query` and
`data-search-loading`. Grepping all of `skills/` confirms neither attribute
is emitted by any reference component — they exist only inside
`readiness.ts` itself. The real debounced-search reference component
(`ng-playwright-testid-attributes`'s async-data-table reference) emits
`data-search-typed`/`data-search-settled`/`data-search-applied`/`data-search-state`
instead. Surfaced 2026-08-22 by an architect review while writing docs-site
usage examples for [[ng-starters-docs-site]] — confirmed real via direct grep,
not a docs error.

**Why:** `ng-playwright-attribute-waits` and `ng-playwright-testid-attributes`
are sibling skills meant to share one attribute contract (producer/consumer),
but the wait helper's contract drifted from what the producer skill actually
emits. Anyone installing `@ng-starters/skill-ng-playwright-attribute-waits`
and following its own reference code for search-debounce waits will poll
attributes that are permanently null and time out.

**How to apply:** This needs a real code fix in
`skills/ng-playwright-attribute-waits/references/readiness.ts` (retarget
`waitForSearchSettled` to the attributes `ng-playwright-testid-attributes`
actually emits), followed by the standard release pipeline (bump via
changesets, `bin/sync-skill-content.mjs`, `bin/validate-skill-package.mjs`)
since the skill is already published to npm. Not fixed as part of the
docs-site work — that work only documented the gap with a `:::caution`
admonition in `website/docs/usage-examples.md` rather than silently masking
it. Treat as a real pre-existing product bug, not a docs nit.

**Status (2026-09-06):** Now tracked, planned, and stress-tested — not yet
executed. Plan: `ng-starters/.internal/plans/2026-09-06-attribute-waits-search-settle-fix.md`
(architect + consensus review approved with changes, all folded in;
adversarial stress-test 7/7 branches resolved). Beads: epic `ng-starters-8ij`,
task `ng-starters-8ij.1` (fix code + SKILL.md + docs-site caution retraction),
task `ng-starters-8ij.2` (changeset + patch release), sequenced via
`bd dep add`. Once this ships, delete this memory file and the repo-local
`.claude/memory/project_attribute-waits-search-settle-bug.md` copy (already
slated for deletion as a plan step) — both go stale the moment the fix
lands.

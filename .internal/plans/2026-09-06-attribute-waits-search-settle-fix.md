# Attribute-Waits Search-Settle Contract Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use beads-superpowers:subagent-driven-development (recommended) or beads-superpowers:executing-plans to implement this plan task-by-task. Each Task becomes a bead (`bd create -t task --parent <epic-id>`). Steps within tasks use checkbox (`- [ ]`) syntax for human readability.

**Goal:** Fix `waitForSearchSettled` in the published `ng-playwright-attribute-waits` skill — and the skill's own normative spec text and public docs-site example that currently teach the same broken contract — so it polls the search-pipeline attributes the sibling `ng-playwright-testid-attributes` skill actually emits, then release the fix through the existing changesets pipeline.

**Architecture:** `skills/ng-playwright-attribute-waits/references/readiness.ts` is the canonical source; `packages/skill-ng-playwright-attribute-waits/references/readiness.ts` is a gitignored, generated mirror published to npm — never hand-edit it or commit it directly. `SKILL.md` is the normative spec an agent reads and must agree with the reference code. `website/docs/usage-examples.md` is a standalone, hand-written doc page (not a generated mirror of anything) that currently documents this bug as a permanent, open gap and must be corrected once it's fixed. The existing `pnpm release` script already runs sync + validate + publish in one gated sequence — no new tooling needed.

**Tech Stack:** TypeScript reference file (`@playwright/test` types only; no build/test runner wired for `skills/references/**` in this repo — root `devDependencies` is only `@changesets/cli`, no `typescript`, no tsconfig, no test script anywhere in the workspace), pnpm workspace, Changesets.

## Global Constraints

- Canonical source of truth is `skills/ng-playwright-attribute-waits/references/readiness.ts`; `packages/skill-ng-playwright-attribute-waits/**` is gitignored (`packages/.gitignore:1-3` ignores `skill-*/*`, only negates `package.json`/`CHANGELOG.md`) — it can be edited on disk but git will never carry the edit, and `pnpm release` regenerates it from the canonical source anyway.
- No test runner is wired for `skills/**/references/*.ts` in this repo. Verification for the code fix is a deterministic `diff`-based contract check between consumer and producer attribute names (real exit code, not an eyeballed print), not a unit test suite — confirmed proportionate for a ~15-line documentation-reference fix, not a corner cut.
- The package is already published to npm (`@ng-starters/skill-ng-playwright-attribute-waits`), so this is a **non-breaking patch release**: the helper has never worked (every call has always timed out against the real component), so no existing consumer has a passing test that depends on the old, broken attribute set. State this explicitly in the changeset so it isn't misread as a breaking change to `query`'s meaning.
- `pnpm release` requires npm publish auth (`npm whoami` / `.npmrc` token) to already be configured in the environment — this plan does not set that up, it assumes it's already true for whoever runs Task 2.
- **Rollback path:** npm unpublish is time-limited and not a reliable recovery path. If a bad version ships, the fix is a follow-up patch release, not an unpublish — Task 2's publish step is the one irreversible action in this plan.

---

## Root cause (verified via direct read, not assumption)

The defect **originates in the spec, not just the code**: `skills/ng-playwright-attribute-waits/SKILL.md:85-94` (invariant 5) normatively prescribes `expect.poll(...).toEqual({ state, query, loading })` — "the load state, the requested/echoed query value, and a loading flag." `references/readiness.ts:71-87` is a faithful implementation of that wrong spec. An agent that reads `SKILL.md` without opening the reference file learns the same broken contract, so fixing only the code would leave the skill self-contradictory.

Producer (`skills/ng-playwright-testid-attributes/references/async-data-table.component.ts:17,52-82` + `async-data-table.component.html:14-17`) emits four attributes on the search `<input>`:
- `data-search-typed` — stage 1, raw value on every keystroke (`typedValue`)
- `data-search-settled` — stage 2, value once debounce elapses (`settledValue`)
- `data-search-applied` — stage 3, value the most recently RESOLVED fetch actually used (`appliedValue`)
- `data-search-state` — derived 4-state machine: `'idle' | 'pending' | 'loading' | 'ready'`, where `'idle'` covers the empty-query case (`component.ts:81`: `typed === '' && applied === '' ? 'idle' : 'ready'`)

Consumer (`skills/ng-playwright-attribute-waits/references/readiness.ts:71-87`, current/broken) polls `data-search-state` (real), `data-search-query` (never emitted anywhere in the repo), `data-search-loading` (never emitted anywhere in the repo) — two of the three polled attributes are permanently `null`, so `waitForSearchSettled` can never resolve to a passing state and always times out.

Two other artifacts teach or reference the same broken contract and must be corrected alongside the code:
- `skills/ng-playwright-attribute-waits/SKILL.md:85-94` — the normative invariant 5 text.
- `website/docs/usage-examples.md:149-182` — a published `:::caution Known gap:::` block plus a code comment stating the mismatch is permanent ("this call will time out until that gap is closed"). This file is hand-written, not a generated mirror — nothing else will fix it.

**Known limitation carried forward, not fixed here:** once the fix requires `typed === settled === applied === expected.query`, the derived `state` becomes reachable only as `'ready'` (non-empty query) or `'idle'` (empty query) — `'pending'`/`'loading'` can never satisfy this helper's assertion, by construction, since those states require the stage attributes to still disagree (`component.ts:79-81`). This is documented in the fixed doc comment (Task 1) rather than solved with a new API: a narrower `waitForSearchState(locator, state)` sibling for asserting mid-flight `'pending'`/`'loading'` states is genuinely useful future work, but is new public API and does not belong in a patch release. Not tracked as a task here — mention to the user as a possible follow-up, not a silent scope cut, since it's called out explicitly in this plan.

## Task 1: Fix the contract everywhere it's taught, and verify with a real check

**Files:**
- Modify: `skills/ng-playwright-attribute-waits/references/readiness.ts:65-87` (function + its doc comment)
- Modify: `skills/ng-playwright-attribute-waits/SKILL.md:85-94` (invariant 5 normative text)
- Modify: `website/docs/usage-examples.md:149-182` (retract the caution block, fix the example)
- Delete (local hygiene, not git-tracked — confirmed via `git ls-files .claude` returning nothing): `.claude/memory/project_attribute-waits-search-settle-bug.md`
- Verify only, no edit: `packages/skill-ng-playwright-attribute-waits/references/readiness.ts` (gitignored mirror; regenerated by `pnpm release` in Task 2, never hand-edited or committed)

**Interfaces:**
- Consumes: nothing new — same `Locator`/`WaitOptions` types already imported at the top of `readiness.ts`.
- Produces: `waitForSearchSettled(locator, expected, opts?)` keeps its existing shape `(locator: Locator, expected: { state: ...; query: string }, opts?: WaitOptions) => Promise<void>`, but `expected.state` narrows from `string` to the literal union `'idle' | 'ready'` (stress-test Branch 7) — the only two terminal states this helper can ever actually observe post-fix. A caller passing a typo'd or intermediate state string (e.g. `'redy'` or `'pending'`) now fails to compile instead of silently hanging for the full timeout at runtime — the same failure class this fix exists to eliminate, caught one layer earlier.

**Acceptance Criteria:**
- `waitForSearchSettled` polls `data-search-typed`, `data-search-settled`, `data-search-applied`, and `data-search-state` — the four attributes the producer component (`skills/ng-playwright-testid-attributes/references/async-data-table.component.html:14-17`) actually emits — via a single atomic `locator.evaluate()` snapshot, not four separate `getAttribute` round-trips.
- It no longer references `data-search-query` or `data-search-loading` anywhere in the file.
- All three value-stage attributes (`typed`/`settled`/`applied`) must equal `expected.query` AND `state` must equal `expected.state` before the wait resolves.
- `expected.state` is typed as the literal union `'idle' | 'ready'`, not `string` — do not import the producer's `SearchState` type to get there (that would couple this consumer skill to the producer skill's internal type); inline the two-member literal union instead.
- The doc comment states plainly that only the two terminal states (`'ready'` for a non-empty settled+applied query, `'idle'` for an empty one) are assertable through this helper, and that an empty-query clear settles to `'idle'`, not `'ready'`.
- `SKILL.md`'s invariant 5 text names the same four real attributes and the same terminal-states caveat — no cross-reference to the reference file is required to learn the correct contract.
- `website/docs/usage-examples.md` no longer contains a caution block or comment claiming this call permanently times out; the example is presented as a working call.
- The contract check (Step 1/4 below) exits non-zero when the two files disagree and zero when they agree — not an eyeballed print comparison.

- [ ] **Step 1: Write the failing contract check**

There is no test runner wired for this file (see Global Constraints), so the "failing test" here is a deterministic `diff`-based contract check with a real exit code, comparing the two files directly:

```bash
diff <(grep -o "data-search-[a-z]*" skills/ng-playwright-attribute-waits/references/readiness.ts | sort -u) \
     <(grep -o "data-search-[a-z]*" skills/ng-playwright-testid-attributes/references/async-data-table.component.html | sort -u)
```

- [ ] **Step 2: Run it and confirm it currently fails**

Expected before the fix: non-empty diff output and non-zero exit code — consumer set is `{data-search-loading, data-search-query, data-search-state}`, producer set is `{data-search-applied, data-search-settled, data-search-state, data-search-typed}`; only `data-search-state` overlaps.

- [ ] **Step 3: Implement the fix in `readiness.ts`**

Replace the body and doc comment of `waitForSearchSettled` (lines 65-87) with:

```typescript
/**
 * Search-settle (invariant 5). Polls ALL FOUR tracked search-pipeline
 * attributes together in one atomic combined assertion — via a single
 * `locator.evaluate()` snapshot rather than four separate `getAttribute`
 * round-trips, which are not atomic and can each observe a different DOM
 * state — rather than checking them one at a time. A partial check is a
 * well-known source of flaky search-test failures: one attribute can read
 * the new query while a sibling attribute still lags behind.
 *
 * Only the two TERMINAL states are assertable through this helper:
 * `'ready'` once a non-empty query has been typed, debounced, AND applied to
 * a resolved fetch, or `'idle'` when the search has been cleared back to an
 * empty query. `'pending'`/`'loading'` describe a still-in-flight search
 * where the three stage attributes still disagree by definition, so they
 * can never satisfy this helper's all-equal assertion — wait for the
 * terminal state, not an intermediate one. `expected.state` is typed as
 * `'idle' | 'ready'` rather than a loose `string` so a caller typo or an
 * attempt to wait on an intermediate state is a compile error, not a
 * silent full-timeout hang.
 */
export async function waitForSearchSettled(
  locator: Locator,
  expected: { state: 'idle' | 'ready'; query: string },
  opts: WaitOptions = {},
): Promise<void> {
  const timeout = opts.timeout ?? DEFAULT_TIMEOUT
  await expect
    .poll(
      () =>
        locator.evaluate((el) => ({
          typed: el.getAttribute('data-search-typed'),
          settled: el.getAttribute('data-search-settled'),
          applied: el.getAttribute('data-search-applied'),
          state: el.getAttribute('data-search-state'),
        })),
      { timeout },
    )
    .toEqual({
      typed: expected.query,
      settled: expected.query,
      applied: expected.query,
      state: expected.state,
    })
}
```

- [ ] **Step 4: Re-run the contract check to verify it passes**

```bash
diff <(grep -o "data-search-[a-z]*" skills/ng-playwright-attribute-waits/references/readiness.ts | sort -u) \
     <(grep -o "data-search-[a-z]*" skills/ng-playwright-testid-attributes/references/async-data-table.component.html | sort -u)
```

Expected: no output, exit code 0 — both sets are exactly `{data-search-applied, data-search-settled, data-search-state, data-search-typed}`.

Note the limit of this check: it verifies the *attribute names* match, not the assertion's field-by-field correctness — that correctness was verified by architect + consensus review against `async-data-table.component.ts:75-82`'s `searchState` derivation before this plan was approved, not by this script.

- [ ] **Step 5: Fix the normative spec text in `SKILL.md`**

Replace `skills/ng-playwright-attribute-waits/SKILL.md:85-94` (invariant 5) with:

```markdown
5. **Search-settle: poll every tracked attribute together, not one at a
   time.** Poll ALL FOUR tracked search-pipeline attributes in a single
   atomic combined assertion — one `locator.evaluate()` snapshot feeding
   `expect.poll(...).toEqual({ typed, settled, applied, state })`, requiring
   the typed/settled/applied stage attributes to all equal the expected
   query AND the derived `data-search-state` to equal the expected terminal
   state (`waitForSearchSettled` in `references/readiness.ts`) — rather than
   checking one attribute in isolation. A partial check is a well-known
   source of flaky search-related test failures: one attribute can read the
   new query while a sibling attribute still lags behind, and a test that
   only checks the first attribute asserts against results for the wrong
   search term. Only the two terminal states are assertable this way:
   `'ready'` for a non-empty settled query, `'idle'` for an empty one —
   `'pending'`/`'loading'` describe a still-in-flight search that by
   definition hasn't reached one stable value across all three stage
   attributes yet. The helper's `expected.state` parameter is typed as the
   literal union `'idle' | 'ready'`, not `string`, so passing an
   intermediate state (or a typo) is a compile error rather than a silent
   full-timeout hang.
```

- [ ] **Step 6: Retract the stale docs-site caution in `website/docs/usage-examples.md`**

Replace lines 149-182 (the `:::caution Known gap:::` block, its lead-in sentence, and the example test) with:

```markdown
The snippet below calls the helper the way it's meant to be used once a
search has fully settled — typed, debounced, and applied to a resolved
fetch:

\`\`\`ts
import { waitForSearchSettled, waitForReady } from './readiness'

test('waits for the search state machine to settle', async ({ page }) => {
  const search = page.getByTestId('async-data-table-search')

  await search.fill('drill')

  // waitForSearchSettled polls all four search-pipeline attributes
  // (data-search-typed/-settled/-applied/-state) together in one atomic
  // snapshot, so this only resolves once the typed value has debounced AND
  // the matching fetch has resolved — never a partial match against a stale
  // row set.
  await waitForSearchSettled(search, { state: 'ready', query: 'drill' })

  await waitForReady(page.getByTestId('async-data-table'))
})
\`\`\`
```

- [ ] **Step 7: Delete the stale local memory note**

```bash
rm -f .claude/memory/project_attribute-waits-search-settle-bug.md
```

(Not git-tracked — `git ls-files .claude` returns nothing for this repo. This is local hygiene, no commit needed for this step. If a global `~/.claude` auto-memory entry about this bug exists outside the repo, correct or delete that separately — out of scope for this repo's git history.)

- [ ] **Step 8: Verify the published-package mirror will regenerate clean (no edit, no commit)**

```bash
node bin/sync-skill-content.mjs ng-playwright-attribute-waits
diff skills/ng-playwright-attribute-waits/references/readiness.ts packages/skill-ng-playwright-attribute-waits/references/readiness.ts
node bin/validate-skill-package.mjs ng-playwright-attribute-waits
```

Expected: `diff` produces no output (mirror now matches canonical source); `validate-skill-package.mjs` exits 0. Do not `git add` anything under `packages/` — it's gitignored (`packages/.gitignore:1-3`) and `pnpm release` in Task 2 regenerates it again anyway; this step is a local diagnostic only.

- [ ] **Step 9: Commit**

```bash
git add skills/ng-playwright-attribute-waits/references/readiness.ts \
        skills/ng-playwright-attribute-waits/SKILL.md \
        website/docs/usage-examples.md
git commit -m "fix(ng-playwright-attribute-waits): retarget waitForSearchSettled to real search-pipeline attributes"
```

---

## Task 2: Changeset + patch release

**Files:**
- Create: `.changeset/fix-search-settle-attributes.md`
- Modify (generated by `pnpm version-packages`, must be committed): `packages/skill-ng-playwright-attribute-waits/package.json`, `skills/ng-playwright-attribute-waits/metadata.json`, `pnpm-lock.yaml`

**Interfaces:**
- Consumes: the committed fix from Task 1.
- Produces: a published patch version of `@ng-starters/skill-ng-playwright-attribute-waits` on npm.

**Acceptance Criteria:**
- A changeset file exists declaring a `patch` bump for `@ng-starters/skill-ng-playwright-attribute-waits`, with a changelog line describing the bug fixed and explicitly noting it is non-breaking (the helper never worked before, so no consumer has a passing test depending on the old attribute set).
- `pnpm version-packages` runs cleanly; both `packages/skill-ng-playwright-attribute-waits/package.json` AND `skills/ng-playwright-attribute-waits/metadata.json` (written by `bin/sync-metadata-version.mjs`, which targets `SKILLS_DIR` — the canonical `skills/` tree, not the `packages/` mirror) show the bumped patch version.
- `pnpm release` exits 0. This runs three gates in order — `bin/generate-skill-package-json.mjs --check`, then `bin/sync-skill-content.mjs --all`, then `bin/validate-skill-package.mjs --all` — before `changeset publish`; a failure in the first (unnamed elsewhere in this plan) gate aborts the whole script with no separate step number, so if `pnpm release` fails immediately, check that gate first.
- Git tags created by `changeset publish` are pushed along with the commit.

- [ ] **Step 1: Create the changeset**

```bash
cat > .changeset/fix-search-settle-attributes.md << 'EOF'
---
"@ng-starters/skill-ng-playwright-attribute-waits": patch
---

Fix `waitForSearchSettled` to poll the search-pipeline attributes
(`data-search-typed`/`data-search-settled`/`data-search-applied`/
`data-search-state`) actually emitted by the sibling
`ng-playwright-testid-attributes` reference component, instead of two
attributes (`data-search-query`/`data-search-loading`) that no component
ever emits and which caused the helper to always time out. Non-breaking:
the helper never worked against the real component before this fix, so no
existing consumer has a passing test that depends on the old attribute set.
EOF
```

- [ ] **Step 2: Version the package**

```bash
pnpm version-packages
```

Expected: `packages/skill-ng-playwright-attribute-waits/package.json` version bumps (patch), `skills/ng-playwright-attribute-waits/metadata.json` version syncs to match (written by `bin/sync-metadata-version.mjs` targeting the canonical `skills/` tree), `.changeset/fix-search-settle-attributes.md` is consumed/removed.

- [ ] **Step 3: Commit the version bump**

```bash
git add packages/skill-ng-playwright-attribute-waits/package.json \
        skills/ng-playwright-attribute-waits/metadata.json \
        pnpm-lock.yaml \
        .changeset
git commit -m "chore: version @ng-starters/skill-ng-playwright-attribute-waits"
```

(Root `package.json` is `"private": true` and not versioned by changesets — no need to stage it.)

- [ ] **Step 4: Publish**

Confirm npm publish auth is already configured in this environment (`npm whoami`) before running — this plan does not set that up.

```bash
pnpm release
```

Expected: exits 0; `@ng-starters/skill-ng-playwright-attribute-waits` published to npm at the new patch version. If it aborts immediately with no clear step match, the failure is most likely `bin/generate-skill-package-json.mjs --check`, the first gate inside this script.

- [ ] **Step 5: Push, including tags**

```bash
git push --follow-tags
```

**Caution (stress-test Branch 3):** if this push fails after Step 4 already succeeded, the package is already correctly published — only the local repo hasn't reached the remote yet. Retry `git push --follow-tags` only. Never re-run `pnpm release` to "retry": the changeset file is already consumed and the version already published, so re-running `changeset publish` would either fail loudly against an already-published version or, worse, attempt a duplicate/conflicting publish.

---

## Stress Test Results: attribute-waits search-settle fix plan

### Resolved Decisions
- **Task granularity:** keep 2 tasks (fix-everywhere / publish) — publish is the one irreversible step and earns its own gate.
- **New `waitForSearchState` sibling API:** deferred to a future minor release, not bundled into this patch.
- **Publish/push failure ordering:** if `git push --follow-tags` fails after a successful `pnpm release`, retry only the push — never re-run `pnpm release`.
- **Security & risk:** no auth/secrets/input surface; the shared `--all` sync/validate step is safe since only one changeset is pending. Checked-safe, no change.
- **Consumer-impact framing:** copy-paste reference code, not a live import — downstream repos aren't retroactively affected; the changeset's non-breaking framing already covers this.
- **`locator.evaluate()` vs `Promise.all`:** keep `evaluate()` — true atomic snapshot, no real downside since `expect.poll()` is already the retry mechanism.
- **`expected.state` typing (reflexion-added):** narrowed from `string` to the literal union `'idle' | 'ready'` — turns a typo/intermediate-state mistake into a compile error instead of a silent full-timeout hang.

### Changes Made
- Task 1: `expected.state` narrowed to `'idle' | 'ready'` in the `readiness.ts` implementation, its doc comment, the Interfaces/Acceptance-Criteria sections, and the `SKILL.md` invariant-5 replacement text.
- Task 2 Step 5: added an explicit caution against re-running `pnpm release` after a push failure that follows a successful publish.

### Deferred / Parking Lot
- `waitForSearchState(locator, state)` narrow sibling helper for mid-flight `'pending'`/`'loading'` assertions — real future work, intentionally not in this patch.

### Confidence Assessment
- Overall: High.
- Areas of concern: none outstanding. The grep/diff contract check still only verifies attribute *names* match, not field-by-field assertion correctness (documented as a stated limitation in Task 1, not a gap the stress test found new).

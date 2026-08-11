---
name: ng-playwright-testid-attributes
description: Use when authoring or editing an Angular modal, drawer, async data table, or any component whose visible content depends on async loading or mutation state, and it needs to be reliably testable with Playwright. Covers deriving state-marker attributes (data-state, data-load-state, aria-busy) via [attr.*] template bindings from the exact same Signal that drives the visual render, epoch counters for repeatable async actions, the four-stage debounced-search attribute pattern, JSON-stringified identity attributes, the @if-unmount hazard and when a permanently-mounted hidden sentinel is (and isn't) required, and preferring standard ARIA attributes over bespoke data-* ones when an ARIA equivalent already exists. This skill does not define the typed testid registry mechanics — pulling every data-testid from a catalog instead of a literal string — that lives in the sibling skill ng-playwright-testid-catalog; and it does not define how test code reads or waits on these attributes, which is the sibling skill ng-playwright-attribute-waits. Use this skill only for the producer side — instrumenting Angular components with the attributes themselves. Triggers on "add data-testid to this Angular component", "make this modal Playwright-testable", "async loading state attributes", "[attr.aria-busy] from a signal", "epoch counter for retries", "debounced search test attributes", "data-load-state", "hidden sentinel for an @if-gated modal", or reviewing whether an Angular component's state attributes will race Playwright.
---

# ng-playwright-testid-attributes

## Overview

Playwright can only trust what the DOM tells it, and the DOM only tells the
truth when a component's attributes are wired to the same Signals that drive
its render. This skill is the **producer** half of a three-skill family: it
defines how to instrument an Angular template with `data-*`/`aria-*`
attributes that describe visual, loading, and interaction state, so a test can
assert on state transitions instead of racing timeouts or scraping visible
text.

```
render-driving Signal (signal() / computed() / input())
        │
        ├─▶ template control flow (@if / @for)      (what the user sees)
        └─▶ [attr.data-state] / [attr.data-load-state] /
            [attr.aria-busy] / [attr.data-<action>-epoch]
                                                    (what Playwright sees)
```

Both branches must read the same Signal — never a parallel computation that
could drift from what's actually rendered. This is not a theoretical shape:
it's the idiom already in use across the Pinnacle design system, where a
Signal read with call syntax is bound straight into a template attribute —
`[attr.aria-busy]="loading()"` and `[attr.data-testid]="testId() + '-button'"`
side by side on the same element
(`libs/pinnacle/src/lib/dropdown/dropdown.component.html:86-87`).

What's out of scope here: the typed constant that supplies a `data-testid`
value is the sibling skill `ng-playwright-testid-catalog`, and the
assertions/waits that read these attributes from test code are the sibling
skill `ng-playwright-attribute-waits`. This skill only covers instrumenting
the component itself.

## The 10 invariants

Create one todo per invariant. Each is independently verifiable.

1. **Derive state-marker attributes from the render-driving Signal, never a
   parallel computation.** A `data-state` or `data-load-state` attribute must
   read the exact same Signal that decides what the template renders — the
   same `isOpen()`, `loadState() === 'loading'`, etc. that the `@if` block
   reads — not a second field computed alongside it. Bind it with Angular's
   attribute syntax, `[attr.data-load-state]="loadState()"`, so the value is
   re-evaluated by the same change-detection pass that re-renders the view.
   The moment there are two independent sources of truth for "is this open" or
   "is this loading," they can disagree after a fast update, an `OnPush`
   component that didn't get marked dirty, or a refactor that only touches one
   of them, and the attribute silently lies to any test reading it. The
   codebase already treats a Signal as that single source: `dropdown` exposes
   `loading = input<boolean>(false)`
   (`libs/pinnacle/src/lib/dropdown/dropdown.component.ts:305`) and
   `isOpenedSignal = signal(false)`
   (`libs/pinnacle/src/lib/dropdown/dropdown.component.ts:221`), then binds
   those same Signals — not copies of them — into
   `[attr.aria-busy]="loading()"` and
   `[attr.aria-expanded]="isOpenedSignal()"`
   (`libs/pinnacle/src/lib/dropdown/dropdown.component.html:86,90`). The same
   pattern holds in `text-area` (`loading = input(false)` at
   `text-area.component.ts:52` → `[attr.aria-busy]="loading()"` at
   `text-area.component.html:40`) and in app code
   (`apps/arcOS-client/src/shared/components/e-signature-envelope/sign-documents/envelope-document-viewer.component.html:45`,
   `[attr.aria-busy]="isLoadingSignal()"`). Prefer a `computed()` when the
   marker is a derivation of other Signals — a `computed()` cannot drift from
   its inputs by construction, which is exactly the guarantee this invariant
   is asking for (see `references/async-details-modal.component.ts`).

2. **`data-state` plus `data-load-state` are the baseline attribute pair for
   async-gated containers.** Any container whose content depends on an async
   fetch or mutation should expose both: `data-state` (`'open' | 'closed'`, or
   an active/inactive equivalent for tab-like UI) for structural visibility,
   and `data-load-state` (`'loading' | 'ready' | 'error' | 'closed'`) for what's
   actually inside once open. Collapsing these into one attribute forces a
   test to guess whether "closed" means "not mounted" or "mounted but
   errored," which is exactly the ambiguity this pair exists to remove. In
   Angular this matters *more* than in React, not less — see invariant 7: a
   closed Pinnacle modal is still in the DOM, so "the element exists" tells a
   test nothing about whether it's open, and `data-state` is the only honest
   answer to that question.

3. **`aria-busy` mirrors the exact loading Signal that drives
   `data-load-state === 'loading'`.** Bind `[attr.aria-busy]="isLoading()"`
   (optionally OR'd with any other pending sub-state, like a background
   refetch) using the same expression that flips `data-load-state`. This gives
   test code a generic, enum-agnostic "is this settled yet" gate —
   `await expect(el).toHaveAttribute('aria-busy', 'false')` — without needing
   to know this component's specific load-state strings. `[attr.aria-busy]`
   bound from a Signal is already the established spelling in this codebase
   (`libs/pinnacle/src/lib/dropdown/dropdown.component.html:86`,
   `libs/pinnacle/src/lib/text-area/text-area.component.html:40`,
   `apps/arcOS-client/src/shared/components/e-signature-envelope/e-signature-envelope.component.html:693`).
   Note the Angular-specific detail: bind through `[attr.aria-busy]`, not a
   plain `aria-busy="{{ ... }}"` interpolation, and be aware that binding
   `null` *removes* the attribute rather than writing `"false"` — if a test
   waits for `aria-busy="false"`, the expression must evaluate to a real
   boolean, not `null`.

4. **Repeatable async actions expose a monotonically-incrementing
   `data-<action>-epoch` counter.** Delete, refresh, save, retry — any action a
   user can trigger more than once — should increment a `data-<action>-epoch`
   attribute exactly once per completed attempt, on success OR failure, and
   never while the attempt is still pending. The terminal state string
   (`'error'`, `'ready'`) can repeat identically across two separate attempts,
   so a test that only waits for that string can pass while still looking at a
   stale result from the previous attempt; only a strictly-increasing counter
   proves a fresh cycle just finished. Hold it in a `signal<number>(0)` and
   bump it in a `finally` block, then bind
   `[attr.data-refresh-epoch]="refreshEpoch()"` (see
   `references/async-details-modal.component.ts`). The monotonic-counter-as-
   staleness-fence idea already exists in this codebase, though for internal
   render bookkeeping rather than for test observation: `ribbon-shell` keeps
   `measureEpoch`, documented as "Monotonically increasing counter — stale
   afterNextRender callbacks compare their captured epoch to bail out"
   (`libs/pinnacle/src/lib/ribbon-shell/ribbon-shell.component.ts:94-98`), and
   uses the exact capture-then-compare fence this invariant asks a test to
   perform — `const epoch = this.measureEpoch();` … `if (this.measureEpoch()
   !== epoch) return;`
   (`libs/pinnacle/src/lib/ribbon-shell/ribbon-shell.component.ts:471-479`).
   No component currently *exposes* an epoch as a DOM attribute for tests to
   read; that part is a translated pattern, not an observed one.

5. **A debounced search input tracks three pipeline stages as a four-state
   machine, never a single boolean.** Expose the raw typed value, the
   debounce-settled value, and the applied-filter value as three separate
   attributes, and drive an overall `idle | pending | loading | ready` state
   from them (see `references/async-data-table.component.ts`). "Typed but not
   yet debounced" and "debounced but not yet applied to the fetch" are
   genuinely different states — a test asserting a filtered row appears needs
   to wait for `ready`, not just for the debounce timer to fire, or it will
   read stale table contents. The debounce half of this pipeline has a real
   precedent here: `cmdk` pipes its `FormControl` through
   `debounceTime(80), distinctUntilChanged()` and lands the result in a Signal
   — `.subscribe((value) => this.query.set(value ?? ''))`
   (`libs/pinnacle/src/lib/cmdk/cmdk.component.ts:75-78`, with
   `query = signal<string>('')` at line 46) — which is precisely the
   raw-vs-settled split, with the raw value living in the `FormControl` and
   the settled value in the Signal. What's absent today is the third stage
   (applied) and the exposure of all three as attributes; that part is
   translated, not observed.

6. **When an attribute's exact identity matters, `JSON.stringify` the full
   value rather than exposing only a count.** A `data-selected-count="3"`
   attribute is fine when a test only cares how many rows are selected, but
   when the test needs to know *which* three, serialize the actual array —
   `[attr.data-selected-ids]="selectedIdsJson()"`, backed by a
   `computed(() => JSON.stringify(this.selectedIds()))` — so it can assert on
   identity directly instead of re-deriving it from unrelated DOM state. Put
   the `JSON.stringify` in a `computed()` rather than calling it inline in the
   template: an inline call re-serializes on every change-detection pass and
   returns a fresh string each time, whereas a `computed()` memoizes on its
   Signal dependencies.

7. **Know whether your container unmounts on close — in Angular the answer is
   usually "no, unless a consumer's `@if` says otherwise," and the sentinel is
   needed only in that second case.** This is the invariant that does NOT
   transfer from the React original unchanged, so it was resolved against real
   source rather than assumed.

   **What Pinnacle's modal actually does: it stays mounted.**
   `lib-modal-popup` renders its `<ea-modal>` wrapper, its `<section>`, its
   `#modalBody`, and its `<ng-content>` unconditionally — nothing in
   `libs/pinnacle/src/lib/modal-popup/modal-popup.component.html:1-79` gates
   the template on `isModalVisible`; that input is only forwarded down
   (`[isModalVisible]="isModalVisible"`, line 7) and mirrored onto the host as
   a class via `@HostBinding('class.is-open')`
   (`libs/pinnacle/src/lib/modal-popup/modal-popup.component.ts:34-38`). The
   vendor `<ea-modal>` underneath behaves the same way. `@angular/cdk`'s
   Dialog/Overlay is not involved, and the vendor package source was not
   installed (`node_modules/` is absent in that checkout), so this was
   confirmed from the compiled component shipped in
   `dist/apps/arcOS-admin/browser/chunk-OVN6QINN.js`
   (`selectors: [["ea-modal"]]`): its template creates the root
   `div.ea-modal-content` and its `ɵɵprojection(4)` content slot
   unconditionally, the only `ɵɵconditional` in the whole template is on
   `!ctx.hideModalHeader` (the header, not the body), and `isModalVisible`
   drives nothing but `ɵɵclassProp("is-open", ctx.isModalVisible)` on the host
   plus `ɵɵattribute("aria-modal", ctx.isModalVisible)`. Visibility is a CSS
   concern keyed off `.is-open`. (The stylesheet implementing `.is-open` ships
   with the vendor package and could not be read, so *how* it hides — display,
   opacity, or transform — is unverified; that it is CSS rather than DOM
   removal is established by the compiled template above.)

   **Consequence 1 — a different hazard than React's.** Because a closed
   modal's DOM stays put, a test must NEVER treat "the element is absent" as
   proof it closed, and must not treat "the element is present" as proof it's
   open. State attributes on the modal itself survive the close, which is
   convenient — but only a documented `data-state="closed"` value, never
   presence/absence, is a trustworthy closed signal. Attribute-level
   visibility can also mislead: Playwright's visibility check follows CSS, so
   an element hidden by `.is-open`-driven CSS reads as hidden while still
   being queryable.

   **Consequence 2 — the sentinel is still required when a consumer wraps the
   component in `@if`.** Angular's `@if` genuinely destroys its embedded view
   and removes those DOM nodes, reproducing the React/Radix unmount problem
   exactly. This is not hypothetical: of 215 `<lib-modal-popup>` usages across
   `apps/` and `libs/`, 72 sit directly inside an `@if` block (for example
   `apps/arcOS-admin/src/pages/smart-fund/smart-fund.component.html:116-117`
   and `:135-136`), while 143 are mounted unconditionally (for example
   `apps/arcOS-admin/src/pages/pre-approval-campaign/components/applicant-form/applicant-form.component.html:274`).
   So roughly a third of real usages *do* unmount on close. When your usage is
   one of those, render a separate, always-mounted (visually hidden) element
   carrying the same `data-state`/`data-load-state` pair, and place it
   **outside** the `@if` — a sentinel inside the `@if` is destroyed alongside
   the thing it was supposed to outlive, which is the single most likely way
   to get this wrong (see `references/async-details-modal.component.html`).
   The cheaper alternative, when you control the consumer, is to drop the
   `@if` and let the modal's own `isModalVisible` do the hiding, which removes
   the need for a sentinel altogether.

8. **Never hand-write a `data-testid` string literal — pull every id from the
   typed catalog.** Every `data-testid` value should come from an imported
   constant bound through `[attr.data-testid]`, not a string typed inline. The
   canonical rule for how that catalog is defined, typed, and kept in sync
   lives in the sibling skill `ng-playwright-testid-catalog`; this invariant is
   a pointer to that rule, not a restatement of it, so the two skills' wording
   doesn't drift apart over time as either one is edited. Note that a bound
   `[attr.data-testid]` is required for catalog-sourced ids — a static
   `data-testid="literal"` in an Angular template is exactly the hand-written
   form this invariant forbids.

9. **Prefer the standard ARIA attribute over a bespoke `data-*` one when an
   ARIA equivalent exists.** Expanded/collapsed, pressed/toggled, and selected
   state already have `aria-expanded`, `aria-pressed`, and `aria-selected` —
   bind those as the PRIMARY signal, and only add a custom `data-*` attribute
   when no ARIA attribute expresses the state. Reinventing a `data-*` version
   of something ARIA already expresses is redundant work that can disagree
   with the ARIA value it duplicates, and it also throws away the
   accessibility benefit that attribute provides for free. Pinnacle's dropdown
   is the model to copy: it reaches for `[attr.aria-expanded]`,
   `[attr.aria-haspopup]`, `[attr.aria-controls]`, and `[attr.aria-busy]`
   first, and only spends a `data-*` attribute on `data-testid`, which has no
   ARIA equivalent
   (`libs/pinnacle/src/lib/dropdown/dropdown.component.html:86-93`).

10. **Static, non-reactive labels are a separate concern from the reactive
    state markers this skill covers.** Analytics/RUM action-naming attributes
    and onboarding-tour anchor attributes are fixed strings set once at author
    time — they don't derive from render state and don't need to satisfy
    invariants 1-9. A plain static `data-*` attribute in the template (no
    brackets) is the correct spelling for these. Don't conflate a fixed label
    with a live state derivation; applying `data-state`-style reasoning to a
    static label attribute is solving a problem it doesn't have.

## Red flags

- An attribute bound from a value that isn't the same Signal driving the `@if`
  branch it describes → invariant 1; the two can disagree after a refactor.
- A field copied out of a Signal into a plain class property that the template
  then binds, instead of binding the Signal itself → invariant 1; the copy
  goes stale silently under `OnPush`.
- A container with only a single boolean/`data-state` attribute covering both
  "is it open" and "is its content loaded" → invariant 2.
- `[attr.aria-busy]` left unset, hardcoded, or driven by a different condition
  than `data-load-state` → invariant 3.
- An `aria-busy` expression that can evaluate to `null`, silently removing the
  attribute a test is waiting to read as `"false"` → invariant 3.
- A repeatable async action (delete/refresh/retry) with no
  `data-<action>-epoch` counter, or one incremented while the attempt is still
  pending → invariant 4.
- A debounced search exposing only one boolean like `isSearching` instead of
  the raw/settled/applied triple → invariant 5.
- A `data-selected-count` attribute where the test actually needs to know
  *which* items are selected, with no serialized identity attribute available
  → invariant 6.
- An inline `JSON.stringify(...)` call in a template binding rather than a
  memoized `computed()` → invariant 6.
- A hidden sentinel placed *inside* the same `@if` block as the component it
  was meant to outlive → invariant 7; it dies with its subject.
- An `@if`-gated modal/drawer with no sentinel outside the block → invariant 7.
- Treating element absence (or mere presence) as the closed/open signal for a
  Pinnacle-style modal that never unmounts → invariant 7; read `data-state`.
- A static `data-testid="some-literal-string"` in a template instead of a
  `[attr.data-testid]` bound to a catalog constant → invariant 8.
- A custom `data-expanded`/`data-pressed`/`data-selected` attribute on an
  element that could instead use `[attr.aria-expanded]`/`[attr.aria-pressed]`/
  `[attr.aria-selected]` → invariant 9.
- A static analytics/onboarding attribute rewritten to "react" to component
  state it was never meant to track → invariant 10.

## References

- `references/async-details-modal.component.ts` /
  `references/async-details-modal.component.html` — a generic details-modal
  component demonstrating `data-state`, `data-load-state`, `aria-busy`, a
  `data-refresh-epoch` counter, a `data-testid` bound from an imported catalog
  constant, and the sentinel placed outside the `@if` per invariant 7.
- `references/async-data-table.component.ts` /
  `references/async-data-table.component.html` — a generic async data table
  demonstrating the debounced-search three-attribute/four-state pattern plus
  `data-load-state`/`aria-busy` on the table itself.
- Companion skill: `skills/ng-playwright-testid-catalog` — every `data-testid`
  value bound onto a component (invariant 8) comes from this catalog, never
  a literal string.
- Companion skill: `skills/ng-playwright-attribute-waits` — the consumer side;
  reads and waits on the exact attributes this skill teaches you to produce.

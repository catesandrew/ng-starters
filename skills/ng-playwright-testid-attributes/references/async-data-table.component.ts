import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounce, distinctUntilChanged, startWith, timer } from 'rxjs';

// In a real app this constant is imported from the typed testid catalog
// described in the sibling skill `ng-playwright-testid-catalog` (invariant 8:
// never hand-write a data-testid string literal). It's inlined here as a
// small mock so this reference file typechecks standalone.
const TESTIDS = {
  asyncDataTable: 'async-data-table',
  asyncDataTableSearch: 'async-data-table-search',
  asyncDataTableEmpty: 'async-data-table-empty',
  asyncDataTableRow: (id: string) => `async-data-table-row-${id}`
} as const;

export type SearchState = 'idle' | 'pending' | 'loading' | 'ready';

export interface Row {
  id: string;
  label: string;
}

/**
 * A generic async data table demonstrating the debounced-search
 * three-attribute/four-state pattern (invariant 5) plus the standard
 * data-load-state / aria-busy pair (invariants 1-3) on the table itself, and
 * a JSON-serialized identity attribute (invariant 6).
 *
 * The FormControl -> debounceTime -> signal wiring mirrors the real idiom in
 * Pinnacle's `cmdk` component, which pipes its query control through
 * `debounceTime(80), distinctUntilChanged()` and lands the result in a
 * signal. What this adds is the THIRD stage — the value actually applied to
 * the completed fetch — and the exposure of all three as attributes.
 */
@Component({
  selector: 'app-async-data-table',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './async-data-table.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AsyncDataTableComponent {
  protected readonly testIds = TESTIDS;

  readonly fetchRows = input.required<(query: string) => Promise<Row[]>>();
  readonly debounceMs = input(300);

  readonly #destroyRef = inject(DestroyRef);

  /** Stage 1 — the raw value the user has typed, updated on every keystroke. */
  protected readonly searchControl = new FormControl<string>('', { nonNullable: true });
  protected readonly typedValue = toSignal(this.searchControl.valueChanges.pipe(startWith('')), {
    initialValue: ''
  });

  /** Stage 2 — the same value once the debounce window has elapsed quietly. */
  protected readonly settledValue = signal('');

  /** Stage 3 — the value that the most recently RESOLVED fetch actually used. */
  protected readonly appliedValue = signal('');

  protected readonly rows = signal<Row[]>([]);
  protected readonly isFetching = signal(false);
  protected readonly selectedIds = signal<string[]>([]);

  /**
   * Invariant 5: the overall 4-state machine a test waits on. Derived from
   * comparing the three stage values plus the in-flight fetch — never a
   * single boolean — so "typed, debouncing" (pending) and "debounced,
   * fetching" (loading) stay distinguishable. A test asserting that a
   * filtered row appeared must wait for 'ready'; waiting only for the
   * debounce timer would read stale table contents.
   */
  protected readonly searchState = computed<SearchState>(() => {
    const typed = this.typedValue();
    const settled = this.settledValue();
    const applied = this.appliedValue();
    if (typed !== settled) return 'pending';
    if (this.isFetching() || settled !== applied) return 'loading';
    return typed === '' && applied === '' ? 'idle' : 'ready';
  });

  /** Invariant 3: same expression that drives data-load-state === 'loading'. */
  protected readonly isLoading = computed(() => this.isFetching());

  protected readonly loadState = computed<'loading' | 'ready'>(() => (this.isFetching() ? 'loading' : 'ready'));

  /**
   * Invariant 6: when a test needs to know WHICH rows are selected rather
   * than just how many, serialize the identities. Memoized in a computed()
   * rather than called inline in the template, so it re-serializes only when
   * `selectedIds` actually changes.
   */
  protected readonly selectedIdsJson = computed(() => JSON.stringify(this.selectedIds()));

  constructor() {
    // Stage 1 -> 2: raw typed value settles once the debounce window elapses
    // with no further keystrokes.
    //
    // `debounce(() => timer(...))` rather than `debounceTime(this.debounceMs())`
    // on purpose: input signals are not populated until after construction, so
    // reading `this.debounceMs()` here to build the operator would capture the
    // declared default (300) and silently ignore whatever the consumer bound.
    // The duration selector re-reads the signal per emission, which is after
    // inputs are set.
    this.searchControl.valueChanges
      .pipe(
        debounce(() => timer(this.debounceMs())),
        distinctUntilChanged(),
        takeUntilDestroyed(this.#destroyRef)
      )
      .subscribe((value) => this.settledValue.set(value ?? ''));

    // Stage 2 -> 3: the settled value is applied to the actual fetch, and
    // only becomes `appliedValue` once that fetch RESOLVES — which is what
    // makes 'loading' distinguishable from 'ready'.
    effect((onCleanup) => {
      const query = this.settledValue();
      const fetch = this.fetchRows();
      let cancelled = false;
      onCleanup(() => {
        cancelled = true;
      });

      this.isFetching.set(true);
      void fetch(query)
        .then((result) => {
          if (cancelled) return;
          this.rows.set(result);
          this.appliedValue.set(query);
        })
        .finally(() => {
          if (!cancelled) this.isFetching.set(false);
        });
    });
  }

  protected toggleRow(id: string): void {
    this.selectedIds.update((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }
}

import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';

// In a real app this constant is imported from the typed testid catalog
// described in the sibling skill `ng-playwright-testid-catalog` (invariant 8:
// never hand-write a data-testid string literal). It's inlined here as a
// small mock so this reference file typechecks standalone.
const TESTIDS = {
  itemDetailsModal: 'item-details-modal'
} as const;

export type LoadState = 'loading' | 'ready' | 'error' | 'closed';

export interface ItemDetails {
  id: string;
  name: string;
  description: string;
}

/**
 * A generic "details modal" for a generic "item" entity, instrumented per the
 * ng-playwright-testid-attributes invariants.
 *
 * Invariant 7 note: this component does NOT gate its own template on
 * `itemId()`. That mirrors Pinnacle's `lib-modal-popup`, which stays mounted
 * and toggles a `.is-open` host class rather than removing DOM. The sentinel
 * in the template exists for the case where a CONSUMER wraps this component
 * in an `@if` — see the template for where it must be placed.
 */
@Component({
  selector: 'app-async-details-modal',
  standalone: true,
  templateUrl: './async-details-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AsyncDetailsModalComponent {
  /** Null means "closed". This is the single render-driving input. */
  readonly itemId = input<string | null>(null);

  /** Fetcher is injected as an input so this reference file stays framework-generic. */
  readonly fetchItem = input.required<(id: string) => Promise<ItemDetails>>();

  readonly closed = output<void>();

  protected readonly testIds = TESTIDS;

  protected readonly loadState = signal<LoadState>('closed');
  protected readonly item = signal<ItemDetails | null>(null);
  protected readonly error = signal<string | null>(null);

  /**
   * Invariant 4: incremented exactly once per completed refresh attempt,
   * success OR failure, and never while the attempt is pending. The terminal
   * state string ('ready'/'error') can repeat identically across two separate
   * attempts, so only this strictly-increasing counter proves a fresh refresh
   * just finished rather than a test observing a stale result left over from
   * before.
   */
  protected readonly refreshEpoch = signal(0);

  /**
   * Invariant 1: every state marker below is a `computed()` over the SAME
   * Signals the template's `@if` blocks read. A `computed()` cannot drift
   * from its inputs by construction — there is no second, hand-maintained
   * copy that a later refactor could forget to update.
   */
  protected readonly isOpen = computed(() => this.itemId() !== null);

  /** Invariant 2: structural visibility, separate from content readiness. */
  protected readonly dataState = computed<'open' | 'closed'>(() => (this.isOpen() ? 'open' : 'closed'));

  /**
   * Invariant 3: the one expression that both flips `data-load-state` to
   * 'loading' and drives `aria-busy`. Returns a real boolean, never null, so
   * `[attr.aria-busy]` always writes "true"/"false" instead of removing the
   * attribute a test is waiting to read.
   */
  protected readonly isLoading = computed(() => this.loadState() === 'loading');

  constructor() {
    // Reacting to the render-driving input keeps the fetch and the attributes
    // fed by the same source (invariant 1) instead of a parallel trigger.
    effect(() => {
      const id = this.itemId();
      if (id === null) {
        this.loadState.set('closed');
        this.item.set(null);
        this.error.set(null);
        return;
      }
      void this.load(id);
    });
  }

  protected onRefresh(): void {
    const id = this.itemId();
    if (id !== null) void this.load(id);
  }

  protected onClose(): void {
    this.closed.emit();
  }

  private async load(id: string): Promise<void> {
    this.loadState.set('loading');
    this.error.set(null);
    try {
      const result = await this.fetchItem()(id);
      this.item.set(result);
      this.loadState.set('ready');
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load item');
      this.loadState.set('error');
    } finally {
      // Bumped once per COMPLETED attempt, on both paths, never mid-flight.
      this.refreshEpoch.update((epoch) => epoch + 1);
    }
  }
}

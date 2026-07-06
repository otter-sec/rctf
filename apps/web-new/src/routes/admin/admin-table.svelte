<!--
  Shared virtualized table shell for the admin data tables (teams, submissions):
  a toolbar pinned above the scroll area, a sticky sortable column header inside
  it, absolutely-positioned recycled rows, fingerprint-driven resets, and an
  optional spliced detail row.

  Like /scores, the virtualizer's scroll margin is a CONSTANT — the consumer
  passes the exact rendered height of its header row. A measured margin (the
  earlier ResizeObserver design) re-layouts every row whenever the header
  reflows, which reads as the whole list bouncing.
-->
<script lang="ts" generics="T">
  import { captureElement } from '$lib/attachments/capture-element'
  import Spinner from '$lib/ui/spinner.svelte'
  import { evaluateLoadMore } from '$lib/virtual/load-more'
  import { createVirtualizer } from '$lib/virtual/virtualizer.svelte'
  import type { Snippet } from 'svelte'
  import { untrack } from 'svelte'
  import {
    isDetailRowIndex,
    resolveExpansion,
    rowIndexForVirtualRow,
    visibleRowCount,
  } from './admin-table-logic'

  interface Props {
    rows: T[]
    rowHeight: number
    /** Exact rendered height of the header snippet, in px — the scroll margin. */
    headerHeight: number
    overscan?: number
    /** Changes whenever the query params change; resets scroll and collapses the detail row. */
    fingerprint: string
    hasNextPage: boolean
    isFetchingNextPage: boolean
    onLoadMore: () => void
    /** Whether any filters are active, so the empty state can distinguish "no data" from "no matches". */
    filtered: boolean
    /** The expanded row's id, two-way bound so the shell can collapse a row that leaves the set. */
    expandedId?: string | null
    expandable?: boolean
    /** Required when `expandable`: extracts the stable id used to track the expanded row. */
    rowId?: (item: T) => string
    /** Minimum content width; forces horizontal scroll on narrow viewports. */
    minTableWidth?: number
    toolbar: Snippet
    header: Snippet
    row: Snippet<[T, number]>
    detailRow?: Snippet<[T]>
    emptyState?: Snippet<[boolean]>
  }

  let {
    rows,
    rowHeight,
    headerHeight,
    overscan = 6,
    fingerprint,
    hasNextPage,
    isFetchingNextPage,
    onLoadMore,
    filtered,
    expandedId = $bindable(null),
    expandable = false,
    rowId,
    minTableWidth = 0,
    toolbar,
    header,
    row,
    detailRow,
    emptyState,
  }: Props = $props()

  const ids = $derived(expandable && rowId ? rows.map(rowId) : [])
  const expandedIndex = $derived(expandedId ? ids.indexOf(expandedId) : -1)
  const visibleCount = $derived(visibleRowCount(rows.length, expandedIndex))

  // Collapse an expansion whose row has left the loaded set (filtered out or
  // paged away) so the spliced detail row never points at a stale index.
  $effect(() => {
    if (!expandable) return
    const resolved = resolveExpansion(expandedId ?? null, ids)
    if (resolved !== expandedId) expandedId = resolved
  })

  let scrollRoot = $state<HTMLElement | null>(null)

  const virtual = createVirtualizer(() => ({
    count: visibleCount + (hasNextPage ? 1 : 0),
    rowHeight,
    overscan,
    scrollMargin: headerHeight,
  }))

  // Reset to the top and collapse any expansion when the query changes. Tracks
  // only `fingerprint`; the scroll node is read untracked so a remount of the
  // container never forces a scroll-to-top on unrelated re-renders.
  $effect(() => {
    void fingerprint
    expandedId = null
    const node = untrack(() => scrollRoot)
    if (node) node.scrollTop = 0
  })

  // Fetch the next page as the virtual range nears the loaded end. The latch is
  // plain control-flow state so it never re-triggers the effect.
  let latched = false
  $effect(() => {
    const last = virtual.virtualItems.at(-1)
    if (!last) return
    const result = evaluateLoadMore({
      lastVisibleIndex: last.index,
      loadedCount: visibleCount,
      overscan,
      hasNextPage,
      isFetching: isFetchingNextPage,
      latched,
    })
    latched = result.latched
    if (result.shouldFetch) onLoadMore()
  })

  const captureScroll = captureElement<HTMLElement>(node => (scrollRoot = node))
</script>

<admin-table data-scrolling={virtual.isScrolling || undefined}>
  <admin-toolbar>
    {@render toolbar()}
  </admin-toolbar>

  <admin-scroll {@attach virtual.scrollContainer} {@attach captureScroll} tabindex="-1">
    <admin-min style:--admin-min-width={minTableWidth ? `${minTableWidth}px` : undefined}>
      <admin-header style:block-size={`${headerHeight}px`}>
        {@render header()}
      </admin-header>

      {#if rows.length === 0}
        <admin-empty>
          {@render emptyState?.(filtered)}
        </admin-empty>
      {:else}
        <!-- Unkeyed so the virtualizer recycles row nodes across large scroll jumps. -->
        <!-- getTotalSize() already excludes the scrollMargin; item.start includes
             it, so only the row translate subtracts headerHeight. -->
        <admin-list style:block-size={`${virtual.totalSize}px`}>
          {#each virtual.virtualItems as item}
            <admin-row
              style:--row-y={`${item.start - headerHeight}px`}
              style:block-size={`${rowHeight}px`}
            >
              {#if item.index >= visibleCount}
                {#if hasNextPage}
                  <admin-spinner><Spinner /></admin-spinner>
                {/if}
              {:else if expandable && detailRow && isDetailRowIndex(item.index, expandedIndex)}
                {@render detailRow(rows[expandedIndex] as T)}
              {:else}
                {@const index = rowIndexForVirtualRow(item.index, expandedIndex)}
                {@render row(rows[index] as T, index)}
              {/if}
            </admin-row>
          {/each}
        </admin-list>
      {/if}
    </admin-min>
  </admin-scroll>
</admin-table>

<style>
  admin-table {
    position: relative;
    display: flex;
    flex-direction: column;
    block-size: 100%;
    inline-size: 100%;
    background: var(--background-l1);
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  admin-toolbar {
    display: block;
    flex-shrink: 0;
  }

  admin-scroll {
    display: block;
    flex: 1;
    min-block-size: 0;
    inline-size: 100%;
    overflow: auto;
    outline: none;
    overscroll-behavior: none;
    /* Recycled rows + a growing list are exactly what browser scroll anchoring
       misreads: it picks an anchor node, the virtualizer moves it, the browser
       compensates, and the view drifts on its own. Virtual scrollers opt out. */
    overflow-anchor: none;
  }

  admin-min {
    display: flex;
    flex-direction: column;
    min-block-size: 100%;
    inline-size: 100%;
    min-inline-size: var(--admin-min-width, 0);
  }

  admin-header {
    position: sticky;
    inset-block-start: 0;
    z-index: 20;
    display: block;
    flex-shrink: 0;
    background: var(--background-l1);
  }

  admin-empty {
    display: flex;
    flex: 1;
    min-block-size: 20rem;
    align-items: center;
    justify-content: center;
  }

  admin-list {
    position: relative;
    display: block;
    inline-size: 100%;
    contain: layout style;
  }

  admin-row {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    display: flex;
    inline-size: 100%;
    translate: 0 var(--row-y);
    contain: layout style;
  }

  admin-spinner {
    display: flex;
    inline-size: 100%;
    align-items: center;
    justify-content: center;
    color: var(--foreground-l3);
    font-size: 1.25rem;
  }

  /* Suppress row tooltips while the list scrolls so they never chase streaming
     rows; consumers read data-scrolling on the shell in their pointer handlers. */
  admin-table[data-scrolling] admin-row {
    pointer-events: none;
  }
</style>

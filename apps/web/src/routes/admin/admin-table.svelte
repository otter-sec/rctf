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
    headerHeight: number
    overscan?: number
    fingerprint: string
    hasNextPage: boolean
    isFetchingNextPage: boolean
    onLoadMore: () => void
    filtered: boolean
    expandedId?: string | null
    expandable?: boolean
    rowId?: (item: T) => string
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

  $effect(() => {
    void fingerprint
    expandedId = null
    const node = untrack(() => scrollRoot)
    if (node) node.scrollTop = 0
  })

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

  <admin-scroll
    {@attach virtual.scrollContainer}
    {@attach captureScroll}
    tabindex="-1"
  >
    <admin-min
      style:--admin-min-width={minTableWidth ? `${minTableWidth}px` : undefined}
    >
      <admin-header style:block-size={`${headerHeight}px`}>
        {@render header()}
      </admin-header>

      {#if rows.length === 0}
        <admin-empty>
          {@render emptyState?.(filtered)}
        </admin-empty>
      {:else}
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
                {@const index = rowIndexForVirtualRow(
                  item.index,
                  expandedIndex
                )}
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

    &[data-scrolling] admin-row {
      pointer-events: none;
    }
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
</style>

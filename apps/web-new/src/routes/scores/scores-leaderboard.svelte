<script lang="ts">
  import { scrollFade } from '$lib/attachments/scroll-fade'
  import { evaluateLoadMore } from '$lib/virtual/load-more'
  import { createVirtualizer } from '$lib/virtual/virtualizer.svelte'
  import type { Attachment } from 'svelte/attachments'
  import {
    SCORE_LOADING_ROW_COUNT,
    SCORE_ROW_HEIGHT_FULL_PX,
    SCORE_VIRTUAL_OVERSCAN,
  } from './scores-constants'
  import type { ScoresData } from './scores-data.svelte'
  import ScoresHeader from './scores-header.svelte'
  import { getChallengeCellsInnerWidth } from './scores-transforms'
  import type { ScoresUrlState } from './scores-url-state.svelte'

  interface Props {
    data: ScoresData
    urlState: ScoresUrlState
  }

  let { data, urlState }: Props = $props()

  let headerHeight = $state(0)

  const virtual = createVirtualizer(() => ({
    count: data.entries.length,
    rowHeight: SCORE_ROW_HEIGHT_FULL_PX,
    overscan: SCORE_VIRTUAL_OVERSCAN,
    scrollMargin: headerHeight,
    getItemKey: index => data.entries[index]?.id ?? index,
  }))

  const contentWidth = $derived(getChallengeCellsInnerWidth(data.challenges))
  const loadingRows = Array.from({ length: SCORE_LOADING_ROW_COUNT }, (_, index) => index)

  // Measured header height feeds the virtualizer scrollMargin; on mobile the
  // header collapses to display:none, so offsetHeight naturally reports 0.
  const measureHeader: Attachment<HTMLElement> = node => {
    const update = () => (headerHeight = node.offsetHeight)
    const observer = new ResizeObserver(update)
    observer.observe(node)
    update()
    return () => observer.disconnect()
  }

  // Fetch the next page as the virtual range nears the loaded end. The latch is
  // plain control-flow state (not reactive) so it never re-triggers the effect;
  // the effect re-runs on virtualItems / loaded-count / fetch-state changes.
  let latched = false
  $effect(() => {
    const last = virtual.virtualItems.at(-1)
    const loadedCount = data.entries.length
    const hasNextPage = data.hasNextPage
    const isFetching = data.isFetchingNextPage
    if (!last) return
    const result = evaluateLoadMore({
      lastVisibleIndex: last.index,
      loadedCount,
      overscan: SCORE_VIRTUAL_OVERSCAN,
      hasNextPage,
      isFetching,
      latched,
    })
    latched = result.latched
    if (result.shouldFetch) void data.fetchNextPage()
  })
</script>

<!--
  Row slot filled by later units. U6 replaces the placeholder team markup inside
  <row-team> with <ScoresTeamRow>; U7 mounts <ScoresSolveCells> inside
  <row-content>. The two-region flex row (sticky team column + content pane) and
  the surrounding shell stay fixed so those units slot components in without
  restructuring.
-->
{#snippet teamRow(entry: { id: string; name: string }, index: number)}
  <row-team>
    <team-rank>#{index + 1}</team-rank>
    <team-name>{entry.name}</team-name>
  </row-team>
  <row-content></row-content>
{/snippet}

{#snippet skeletonRow()}
  <row-team>
    <team-skeleton></team-skeleton>
  </row-team>
  <row-content></row-content>
{/snippet}

<scores-shell style:--score-content-width={`${contentWidth}px`}>
  <scores-scroll {@attach virtual.scrollContainer} {@attach scrollFade} tabindex="-1">
    <scores-table>
      <header-row {@attach measureHeader}>
        <header-corner></header-corner>
        <header-content>
          {#if data.challenges.length > 0}
            <ScoresHeader
              viewMode={urlState.viewMode}
              sortMode={urlState.sortMode}
              categoryGroups={data.categoryGroups}
              challenges={data.challenges}
            />
          {/if}
        </header-content>
      </header-row>

      <virtual-list
        style:block-size={data.isLoading
          ? `${SCORE_LOADING_ROW_COUNT * SCORE_ROW_HEIGHT_FULL_PX}px`
          : `${virtual.totalSize}px`}
      >
        {#if data.isLoading}
          {#each loadingRows as index (index)}
            <virtual-row data-loading style:--row-y={`${index * SCORE_ROW_HEIGHT_FULL_PX}px`}>
              {@render skeletonRow()}
            </virtual-row>
          {/each}
        {:else}
          {#each virtual.virtualItems as item (item.key)}
            {@const entry = data.entries[item.index]}
            <virtual-row
              data-loading={entry ? undefined : true}
              style:--row-y={`${item.start - headerHeight}px`}
            >
              {#if entry}
                {@render teamRow(entry, item.index)}
              {:else}
                {@render skeletonRow()}
              {/if}
            </virtual-row>
          {/each}
        {/if}
      </virtual-list>
    </scores-table>
  </scores-scroll>
</scores-shell>

<style>
  scores-shell {
    --score-row-gap: 4px;
    --score-row-height-full: 68px;
    --score-row-height: calc(var(--score-row-height-full) - var(--score-row-gap));
    --score-name-row-height: 128px;
    --score-diagonal-overflow: 96px;
    --score-team-column-width: 100%;
    display: flex;
    flex: 1;
    min-block-size: 0;
    inline-size: 100%;
  }

  scores-scroll {
    flex: 1;
    min-block-size: 0;
    inline-size: 100%;
    overflow: auto;
    outline: none;
    scrollbar-width: thin;
  }

  scores-table {
    display: block;
    position: relative;
    inline-size: 100%;
  }

  header-row {
    display: none;
  }

  virtual-list {
    display: block;
    position: relative;
    inline-size: 100%;
    contain: layout style;
  }

  virtual-row {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    display: flex;
    inline-size: 100%;
    block-size: var(--score-row-height-full);
    translate: 0 var(--row-y);
    contain: layout style paint;
  }

  row-team {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    flex-shrink: 0;
    inline-size: var(--score-team-column-width);
    block-size: var(--score-row-height);
    padding-inline: var(--space-m);
    background: var(--background-l1);
    border-radius: var(--radius-lg);
  }

  team-rank {
    color: var(--foreground-l3);
    font-variant-numeric: tabular-nums;
  }

  team-name {
    overflow: hidden;
    color: var(--foreground-l0);
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  team-skeleton {
    display: block;
    inline-size: 60%;
    block-size: 1rem;
    background: var(--background-l3);
    border-radius: var(--radius-sm);
  }

  row-content {
    display: none;
  }

  @media (width >= 48rem) {
    scores-shell {
      --score-team-column-width: 20rem;
    }

    scores-table {
      inline-size: max-content;
    }

    header-row {
      display: flex;
      position: sticky;
      inset-block-start: 0;
      z-index: 20;
      background: var(--background-l0);
    }

    header-corner {
      position: sticky;
      inset-inline-start: 0;
      z-index: 1;
      flex-shrink: 0;
      inline-size: var(--score-team-column-width);
      background: var(--background-l0);
    }

    header-content {
      display: block;
      flex: 1;
      inline-size: max-content;
    }

    virtual-list {
      inline-size: max-content;
    }

    virtual-row {
      inline-size: auto;
    }

    row-team {
      position: sticky;
      inset-inline-start: 0;
      z-index: 10;
      background: var(--background-l0);
      border-radius: 0;
    }

    row-content {
      display: block;
      flex-shrink: 0;
      inline-size: var(--score-content-width);
      block-size: var(--score-row-height);
    }
  }

  @media (width >= 80rem) {
    scores-shell {
      --score-team-column-width: 28rem;
    }
  }
</style>

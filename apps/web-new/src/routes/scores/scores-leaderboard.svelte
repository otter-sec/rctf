<script lang="ts">
  import { scrollFade } from '$lib/attachments/scroll-fade'
  import { resolvePinnedEdge, type ViewportClip } from '$lib/components/pinned-self-row'
  import type { LeaderboardEntry } from '$lib/query/leaderboard'
  import { evaluateLoadMore } from '$lib/virtual/load-more'
  import { createVirtualizer } from '$lib/virtual/virtualizer.svelte'
  import type { Attachment } from 'svelte/attachments'
  import { resolveCellTooltip, type CellTooltip } from './scores-cell-tooltip'
  import {
    SCORE_LOADING_ROW_COUNT,
    SCORE_ROW_HEIGHT_FULL_PX,
    SCORE_VIRTUAL_OVERSCAN,
  } from './scores-constants'
  import type { ScoresData } from './scores-data.svelte'
  import ScoresGraph from './scores-graph.svelte'
  import ScoresHeader from './scores-header.svelte'
  import ScoresSelfRow from './scores-self-row.svelte'
  import ScoresSolveCells from './scores-solve-cells.svelte'
  import ScoresTeamRow from './scores-team-row.svelte'
  import {
    getCategoryCellsInnerWidth,
    getChallengeCellsInnerWidth,
    getEmptyGraphVisibility,
    getGraphVisibility,
    getRankVariant,
  } from './scores-transforms'
  import type { ScoresUrlState } from './scores-url-state.svelte'

  interface Props {
    data: ScoresData
    urlState: ScoresUrlState
    divisions: Record<string, string>
    startTime: number
  }

  let { data, urlState, divisions, startTime }: Props = $props()

  const showDivision = $derived(Object.keys(divisions).length > 1)

  let headerHeight = $state(0)

  const virtual = createVirtualizer(() => ({
    count: data.entries.length,
    rowHeight: SCORE_ROW_HEIGHT_FULL_PX,
    overscan: SCORE_VIRTUAL_OVERSCAN,
    scrollMargin: headerHeight,
    getItemKey: index => data.entries[index]?.id ?? index,
  }))

  const contentWidth = $derived(
    urlState.viewMode === 'categories'
      ? getCategoryCellsInnerWidth(data.categoryGroups.length)
      : getChallengeCellsInnerWidth(data.challenges)
  )
  const loadingRows = Array.from({ length: SCORE_LOADING_ROW_COUNT }, (_, index) => index)

  // One delegated pointer listener resolves the hovered cell's data-* into
  // tooltip content, avoiding a tooltip instance per matrix cell. Suppressed
  // while the virtualizer is scrolling so tooltips never chase streaming rows.
  let activeTooltip = $state<CellTooltip | null>(null)
  let tooltipX = $state(0)
  let tooltipY = $state(0)

  // Shared hover state read by the graph (R15). Hovering any row (or its
  // sparkline) highlights that team's line; hovering a solved challenge cell
  // additionally drops a crosshair on that team's line at the solve time. The
  // same delegated listener resolves both from data-* on the hovered elements.
  let hoveredTeamId = $state<string | null>(null)
  let solveHighlight = $state<{ teamId: string; time: number } | null>(null)

  function clearTooltip() {
    activeTooltip = null
  }

  function clearHover() {
    clearTooltip()
    hoveredTeamId = null
    solveHighlight = null
  }

  function handlePointerMove(event: PointerEvent) {
    const target = event.target instanceof Element ? event.target : null
    const row = target?.closest<HTMLElement>('[data-team-id]') ?? null
    const cell = target?.closest<HTMLElement>('[data-tooltip-cell]') ?? null

    hoveredTeamId = row?.dataset.teamId ?? null
    solveHighlight =
      row?.dataset.teamId && cell?.dataset.kind === 'challenge' && cell.dataset.solveTime
        ? { teamId: row.dataset.teamId, time: Number(cell.dataset.solveTime) }
        : null

    if (virtual.isScrolling || !cell) {
      clearTooltip()
      return
    }
    const resolved = resolveCellTooltip(cell.dataset)
    if (!resolved) {
      clearTooltip()
      return
    }
    const rect = cell.getBoundingClientRect()
    activeTooltip = resolved
    tooltipX = rect.left + rect.width / 2
    tooltipY = rect.top
  }

  // Windowed graph series (R12/R14). The window is the min→max rank of the
  // rendered virtual rows; getGraphVisibility caps it to a 15-team span and adds
  // the top-3/self pins. The resolved set is frozen while the list scrolls and
  // re-adopted only once scrolling settles (AE5), so the lines hold steady
  // through a flick instead of thrashing.
  const liveWindow = $derived.by(() => {
    let min = Infinity
    let max = -Infinity
    for (const item of virtual.virtualItems) {
      if (item.index >= data.entries.length) continue
      if (item.index < min) min = item.index
      if (item.index > max) max = item.index
    }
    if (min === Infinity) return { minRank: 0, maxRank: 0 }
    return { minRank: min + 1, maxRank: max + 1 }
  })

  const liveVisibility = $derived(
    getGraphVisibility({
      entries: data.entries,
      isLoading: data.isLoading,
      minRank: liveWindow.minRank,
      maxRank: liveWindow.maxRank,
      showTop3Context: data.showTop3Context,
      showSelfContext: data.showSelfContext,
      currentUserId: data.currentUserId,
      teamRanks: data.teamRanks,
    })
  )

  let graphVisibility = $state(getEmptyGraphVisibility())
  $effect(() => {
    if (!virtual.isScrolling) graphVisibility = liveVisibility
  })

  // Suppress the tooltip while the list is scrolling without discarding the
  // hovered state, so it reappears on settle if the pointer is still over a cell.
  const displayedTooltip = $derived(virtual.isScrolling ? null : activeTooltip)

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

  // Self-row pinning (R11). The scroll container is captured so an
  // IntersectionObserver on the real self row can use it as its root; the
  // observed clip plus the self index feed the shared pinned-edge reducer.
  let scrollRoot = $state<HTMLElement | null>(null)
  // 'visible' while the real row is on screen; 'above'/'below' the edge it left
  // by. Deliberately not reset on the observer's teardown: when a virtual row
  // unmounts far off screen its last known edge is the correct one to keep.
  let selfClip = $state<ViewportClip>(null)

  const selfIndex = $derived(
    data.currentUserId ? data.entries.findIndex(entry => entry.id === data.currentUserId) : -1
  )
  const searchActive = $derived(!!urlState.search)

  const selfEdge = $derived(
    resolvePinnedEdge({
      hasSelf: !!data.currentUser && (data.isLoading || data.currentUser.globalPlace !== null),
      selfIndex: selfIndex === -1 ? null : selfIndex,
      viewportClip: selfClip,
      searchActive,
    })
  )

  // The overlay's row model: the loaded entry when self is on a loaded page,
  // otherwise a row synthesized from the current-user query so the pin still
  // renders while self sits beyond the loaded pages (or the first page is still
  // loading). In the synthesized case the solve maps hold no entry for self, so
  // the solve strip renders empty until the page carrying self arrives.
  const selfRow = $derived.by((): { entry: LeaderboardEntry; index: number } | null => {
    const user = data.currentUser
    if (!user) return null
    const loaded = data.entries[selfIndex]
    if (selfIndex !== -1 && loaded) return { entry: loaded, index: selfIndex }
    return {
      entry: {
        id: user.id,
        name: user.name,
        score: user.score,
        avatarUrl: user.avatarUrl,
        countryCode: user.countryCode,
        statusText: user.statusText,
        solves: user.solves.map(solve => ({ id: solve.id, solveTime: solve.createdAt })),
        dynamicScores: user.dynamicScores,
        division: user.division,
        divisionPlace: user.divisionPlace ?? 0,
        globalPlace: user.globalPlace,
      },
      index: (user.globalPlace ?? 1) - 1,
    }
  })

  const captureScroll: Attachment<HTMLElement> = node => {
    scrollRoot = node
    return () => {
      if (scrollRoot === node) scrollRoot = null
    }
  }

  // Attached only to the virtualized row whose entry is the current user; tracks
  // which viewport edge it leaves by so the overlay pins to that edge.
  const observeSelfRow: Attachment<HTMLElement> = node => {
    const root = scrollRoot
    if (!root) return
    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0]
        if (!entry) return
        const bounds = entry.rootBounds
        if (entry.isIntersecting || !bounds) {
          selfClip = 'visible'
          return
        }
        selfClip = entry.boundingClientRect.top < bounds.top ? 'above' : 'below'
      },
      { root, threshold: 0 }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }
</script>

{#snippet teamRow(entry: LeaderboardEntry, index: number)}
  {@const isSelf = data.currentUserId === entry.id}
  {@const variant = getRankVariant(entry.globalPlace ?? index + 1, isSelf)}
  <row-team data-rank={variant} data-current={isSelf || undefined}>
    <ScoresTeamRow {data} {entry} {index} {divisions} {showDivision} />
  </row-team>
  <row-content data-current={isSelf || undefined}>
    <ScoresSolveCells {data} {entry} viewMode={urlState.viewMode} />
  </row-content>
{/snippet}

{#snippet skeletonRow()}
  <row-team>
    <team-skeleton></team-skeleton>
  </row-team>
  <row-content></row-content>
{/snippet}

{#snippet graphPanel()}
  <ScoresGraph
    graphData={data.graphData}
    visibleTeamIds={graphVisibility.visibleTeamIds}
    contextTeamIds={graphVisibility.contextTeamIds}
    teamRanks={data.teamRanks}
    selfId={data.currentUserId}
    {startTime}
    {hoveredTeamId}
    {solveHighlight}
    showTop3Context={data.showTop3Context}
    showSelfContext={data.showSelfContext}
    onToggleTop3={() => urlState.setShowTop3Context(!data.showTop3Context)}
    onToggleSelf={() => urlState.setShowSelfContext(!data.showSelfContext)}
  />
{/snippet}

<scores-shell style:--score-content-width={`${contentWidth}px`}>
  <mobile-graph>
    {@render graphPanel()}
  </mobile-graph>

  <!-- The pointer handlers only delegate hover-to-tooltip resolution for the
       matrix cells; the scroll region itself carries no interactive semantics. -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <scores-scroll
    {@attach virtual.scrollContainer}
    {@attach captureScroll}
    {@attach scrollFade}
    tabindex="-1"
    onpointermove={handlePointerMove}
    onpointerleave={clearHover}
  >
    <scores-table>
      <header-row {@attach measureHeader}>
        <header-corner>
          <graph-panel>
            {@render graphPanel()}
          </graph-panel>
        </header-corner>
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
              data-team-id={entry?.id}
              style:--row-y={`${item.start - headerHeight}px`}
              {@attach entry && data.currentUserId === entry.id ? observeSelfRow : undefined}
            >
              {#if entry}
                {@render teamRow(entry, item.index)}
              {:else}
                {@render skeletonRow()}
              {/if}
            </virtual-row>
          {/each}
        {/if}

        {#if selfEdge && selfRow}
          <ScoresSelfRow
            {data}
            entry={selfRow.entry}
            index={selfRow.index}
            edge={selfEdge}
            {headerHeight}
            viewMode={urlState.viewMode}
            {divisions}
            {showDivision}
          />
        {/if}
      </virtual-list>
    </scores-table>
  </scores-scroll>

  {#if displayedTooltip}
    <cell-tooltip aria-hidden="true" style:left={`${tooltipX}px`} style:top={`${tooltipY}px`}>
      <strong data-capitalize={displayedTooltip.capitalize || undefined}>
        {displayedTooltip.title}
      </strong>
      {#each displayedTooltip.lines as line, index (index)}
        <span data-trend={line.trend}>{line.text}</span>
      {/each}
    </cell-tooltip>
  {/if}
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
    flex-direction: column;
    min-block-size: 0;
    inline-size: 100%;
  }

  mobile-graph {
    display: block;
    flex-shrink: 0;
    block-size: 12rem;
    margin-block-end: var(--space-xs);
    background: var(--background-l1);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  graph-panel {
    display: none;
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
    --rank-fg-l0: var(--foreground-l0);
    --rank-fg-l1: var(--foreground-l3);
    --rank-glow: transparent;
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    flex-shrink: 0;
    inline-size: var(--score-team-column-width);
    block-size: var(--score-row-height);
    padding-inline: var(--space-m);
    background: var(--background-l1);
    border-radius: var(--radius-lg);

    &[data-rank='first'] {
      --rank-fg-l0: var(--foreground-gold-l0);
      --rank-fg-l1: var(--foreground-gold-l1);
      --rank-glow: color-mix(in oklab, var(--foreground-gold-l0) 15%, transparent);
    }

    &[data-rank='second'] {
      --rank-fg-l0: var(--foreground-silver-l0);
      --rank-fg-l1: var(--foreground-silver-l1);
      --rank-glow: color-mix(in oklab, var(--foreground-silver-l0) 15%, transparent);
    }

    &[data-rank='third'] {
      --rank-fg-l0: var(--foreground-bronze-l0);
      --rank-fg-l1: var(--foreground-bronze-l1);
      --rank-glow: color-mix(in oklab, var(--foreground-bronze-l0) 15%, transparent);
    }

    &[data-rank='self'] {
      --rank-fg-l0: var(--foreground-self-l0);
      --rank-fg-l1: var(--foreground-self-l1);
      --rank-glow: color-mix(in oklab, var(--foreground-self-l0) 15%, transparent);
    }

    &[data-current] {
      background: var(--background-self-l0);
    }
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

    mobile-graph {
      display: none;
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

    graph-panel {
      display: block;
      block-size: 100%;
      min-block-size: 8rem;
      background: var(--background-l1);
      border-start-start-radius: var(--radius-lg);
      border-start-end-radius: var(--radius-lg);
      border-end-start-radius: var(--radius-lg);
      overflow: hidden;
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
      border-start-end-radius: 0;
      border-end-end-radius: 0;
    }

    row-content {
      display: block;
      flex-shrink: 0;
      inline-size: var(--score-content-width);
      block-size: var(--score-row-height);
      background: var(--background-l1);
      border-start-end-radius: var(--radius-lg);
      border-end-end-radius: var(--radius-lg);

      &[data-current] {
        background: var(--background-self-l0);
      }
    }
  }

  cell-tooltip {
    position: fixed;
    z-index: var(--layer-popover);
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    max-inline-size: 16rem;
    padding: var(--space-3xs) var(--space-2xs);
    background: var(--background-l2);
    border: 2px solid var(--border);
    border-radius: var(--radius-sm);
    pointer-events: none;
    translate: -50% calc(-100% - 0.625rem);

    strong {
      color: var(--foreground-l1);
      font-size: var(--step--1);
      font-weight: 400;

      &[data-capitalize] {
        text-transform: capitalize;
      }
    }

    span {
      color: var(--foreground-l3);
      font-size: var(--step--1);
      white-space: nowrap;

      &[data-trend='positive'] {
        color: var(--foreground-success);
      }

      &[data-trend='negative'] {
        color: var(--foreground-destructive);
      }
    }
  }

  @media (width >= 80rem) {
    scores-shell {
      --score-team-column-width: 28rem;
    }
  }
</style>

<script lang="ts">
  import { captureElement } from '$lib/attachments/capture-element'
  import { resolvePinnedEdge, type ViewportClip } from '$lib/components/pinned-self-row'
  import { createScrollGeometry, deriveEdgeFades } from '$lib/components/scroll-geometry.svelte'
  import type { LeaderboardEntry } from '$lib/query/leaderboard'
  import { evaluateLoadMore } from '$lib/virtual/load-more'
  import { createVirtualizer } from '$lib/virtual/virtualizer.svelte'
  import { untrack } from 'svelte'
  import ScoresGraph from '../graph/graph.svelte'
  import type { ScoresData } from '../model/data.svelte'
  import {
    getCategoryCellsInnerWidth,
    getChallengeCellsInnerWidth,
    getGraphVisibility,
    getRankVariant,
  } from '../model/transforms'
  import type { ScoresUrlState } from '../model/url-state.svelte'
  import { BLOOD_PATHS } from './cell-icons'
  import { CELL_KIND, resolveCellTooltip, type CellTooltip } from './cell-tooltip'
  import {
    SCORE_DIAGONAL_OVERFLOW_PX,
    SCORE_HEADER_HEIGHT_PX,
    SCORE_ROW_GAP_PX,
    SCORE_ROW_HEIGHT_FULL_PX,
    SCORE_VIRTUAL_OVERSCAN,
  } from './constants'
  import ScoresHeader from './leaderboard-header.svelte'
  import ScoresScrollbars from './scrollbars.svelte'
  import ScoresSelfRow from './self-row.svelte'
  import ScoresSolveCells from './solve-cells.svelte'
  import ScoresTeamRow from './team-row.svelte'

  interface Props {
    data: ScoresData
    urlState: ScoresUrlState
    divisions: Record<string, string>
    startTime: number
  }

  let { data, urlState, divisions, startTime }: Props = $props()

  const showDivision = $derived(Object.keys(divisions).length > 1)

  function focusChallenge(id: string) {
    const wasFocused = urlState.focusedChallengeId === id
    urlState.setFocusedChallenge(wasFocused ? null : id)
    if (!wasFocused && scrollRoot) scrollRoot.scrollTop = 0
  }

  let isDesktop = $state(false)
  $effect(() => {
    const query = window.matchMedia('(width >= 48rem)')
    const update = () => (isDesktop = query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  })
  const headerOffset = $derived(isDesktop ? SCORE_HEADER_HEIGHT_PX : 0)

  const virtual = createVirtualizer(() => ({
    count: data.entries.length,
    rowHeight: SCORE_ROW_HEIGHT_FULL_PX,
    overscan: SCORE_VIRTUAL_OVERSCAN,
    scrollMargin: headerOffset,
    getItemKey: index => data.entries[index]?.id ?? index,
  }))

  const contentWidth = $derived(
    (urlState.viewMode === 'categories'
      ? getCategoryCellsInnerWidth(data.categoryGroups.length)
      : getChallengeCellsInnerWidth(data.challenges)) +
      SCORE_ROW_GAP_PX +
      SCORE_DIAGONAL_OVERFLOW_PX
  )

  let activeTooltip = $state<CellTooltip | null>(null)
  let tooltipX = $state(0)
  let tooltipY = $state(0)
  let tooltipPlace = $state<'top' | 'bottom'>('top')

  const TOOLTIP_OPEN_DELAY_MS = 400
  const TOOLTIP_COOLDOWN_MS = 300
  let tooltipWarm = false
  let openTimer: ReturnType<typeof setTimeout> | undefined
  let coolTimer: ReturnType<typeof setTimeout> | undefined
  let pendingCell: Element | null = null
  let tooltipCell: Element | null = null

  function cancelOpenTimer() {
    clearTimeout(openTimer)
    openTimer = undefined
    pendingCell = null
  }

  $effect(() => () => {
    clearTimeout(openTimer)
    clearTimeout(coolTimer)
  })

  let hoveredTeamId = $state<string | null>(null)
  let solveHighlight = $state<{ teamId: string; time: number } | null>(null)

  let hoveredColumnId = $state<string | null>(null)
  let hoveredRowId = $state<string | null>(null)

  function clearTooltip() {
    cancelOpenTimer()
    if (activeTooltip) {
      activeTooltip = null
      tooltipCell = null
      clearTimeout(coolTimer)
      coolTimer = setTimeout(() => {
        tooltipWarm = false
      }, TOOLTIP_COOLDOWN_MS)
    }
  }

  function clearHover() {
    clearTooltip()
    hoveredTeamId = null
    solveHighlight = null
    hoveredColumnId = null
    hoveredRowId = null
  }

  function handlePointerMove(event: PointerEvent) {
    const target = event.target instanceof Element ? event.target : null
    const row = target?.closest<HTMLElement>('[data-team-id]') ?? null
    const cell = target?.closest<HTMLElement>('[data-tooltip-cell]') ?? null
    const spark = target?.closest('spark-slot')

    const teamId = row?.dataset.teamId ?? null
    const overMatrixGap = row ? !target?.closest('row-team') : !!target?.closest('challenge-header')
    if (cell) {
      hoveredColumnId = cell.dataset.col ?? null
      hoveredRowId = teamId
    } else if (!overMatrixGap) {
      hoveredColumnId = null
      hoveredRowId = null
    }
    if (spark) {
      hoveredTeamId = teamId
      solveHighlight = null
    } else if (!cell) {
      hoveredTeamId = null
      solveHighlight = null
    }

    if (virtual.isScrolling || !cell) {
      clearTooltip()
      return
    }
    if (cell === pendingCell || (activeTooltip && cell === tooltipCell)) return
    const resolved = resolveCellTooltip(cell.dataset, startTime)
    if (!resolved) {
      clearTooltip()
      return
    }
    const kind = cell.dataset.kind
    const isHeader = kind === CELL_KIND.headerChallenge || kind === CELL_KIND.headerCategory
    const show = () => {
      const rect = cell.getBoundingClientRect()
      activeTooltip = resolved
      tooltipCell = cell
      tooltipX = rect.left + rect.width / 2
      tooltipY = isHeader ? rect.bottom : rect.top
      tooltipPlace = isHeader ? 'bottom' : 'top'
      tooltipWarm = true
      clearTimeout(coolTimer)
      hoveredTeamId = teamId
      solveHighlight =
        teamId && kind === CELL_KIND.challenge && cell.dataset.solveTime
          ? { teamId, time: Number(cell.dataset.solveTime) }
          : null
    }
    cancelOpenTimer()
    if (tooltipWarm && isHeader) {
      show()
      return
    }
    activeTooltip = null
    pendingCell = cell
    openTimer = setTimeout(show, TOOLTIP_OPEN_DELAY_MS)
  }

  let lastWindow = { minRank: 0, maxRank: 0 }
  const liveWindow = $derived.by(() => {
    let minRank = 0
    let maxRank = 0
    const loaded = data.entries.length
    if (loaded > 0 && geometry.clientHeight > 0) {
      const bandTop = geometry.scrollTop + headerOffset
      const bandBottom = geometry.scrollTop + geometry.clientHeight
      const rowMid = (index: number) =>
        headerOffset + index * SCORE_ROW_HEIGHT_FULL_PX + SCORE_ROW_HEIGHT_FULL_PX / 2
      const first = Math.max(0, Math.ceil((bandTop - rowMid(0)) / SCORE_ROW_HEIGHT_FULL_PX))
      const last = Math.min(
        loaded - 1,
        Math.ceil((bandBottom - rowMid(0)) / SCORE_ROW_HEIGHT_FULL_PX) - 1
      )
      if (last >= first) {
        minRank = first + 1
        maxRank = last + 1
      }
    }
    if (lastWindow.minRank !== minRank || lastWindow.maxRank !== maxRank) {
      lastWindow = { minRank, maxRank }
    }
    return lastWindow
  })

  const graphVisibility = $derived(
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

  const displayedTooltip = $derived(virtual.isScrolling ? null : activeTooltip)

  $effect(() => {
    void data.entries
    untrack(clearHover)
  })

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

  let scrollRoot = $state<HTMLElement | null>(null)
  const geometry = createScrollGeometry(() => scrollRoot)

  const fades = deriveEdgeFades(geometry)
  const fadeLeft = $derived(geometry.scrollLeft > 1)
  const fadeRight = $derived(geometry.scrollLeft < geometry.scrollWidth - geometry.clientWidth - 1)

  const selfIndex = $derived(
    data.currentUserId ? (data.teamRanks.get(data.currentUserId) ?? 0) - 1 : -1
  )

  const selfClip = $derived.by((): ViewportClip => {
    if (selfIndex === -1 || geometry.clientHeight === 0) return null
    const rowTop = headerOffset + selfIndex * SCORE_ROW_HEIGHT_FULL_PX
    const rowBottom = rowTop + SCORE_ROW_HEIGHT_FULL_PX
    if (rowTop < geometry.scrollTop + headerOffset) return 'above'
    if (rowBottom > geometry.scrollTop + geometry.clientHeight) return 'below'
    return 'visible'
  })
  const searchActive = $derived(!!urlState.search)

  const selfEdge = $derived(
    resolvePinnedEdge({
      hasSelf: !!data.currentUser && (data.isLoading || data.currentUser.globalPlace !== null),
      selfIndex: selfIndex === -1 ? null : selfIndex,
      viewportClip: selfClip,
      searchActive,
    })
  )

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

  const captureScroll = captureElement<HTMLElement>(node => (scrollRoot = node))
</script>

{#snippet teamRow(entry: LeaderboardEntry, index: number)}
  {@const isSelf = data.currentUserId === entry.id}
  {@const variant = getRankVariant(entry.globalPlace ?? index + 1, isSelf)}
  <row-team
    data-rank={variant}
    data-ranked={variant !== 'nth' || undefined}
    data-current={isSelf || undefined}
    data-hovered={hoveredRowId === entry.id || undefined}
  >
    <ScoresTeamRow {data} {entry} {index} {divisions} {showDivision} />
  </row-team>
  <row-content
    data-current={isSelf || undefined}
    data-hovered={hoveredRowId === entry.id || undefined}
  >
    <ScoresSolveCells
      {data}
      {entry}
      viewMode={urlState.viewMode}
      sortMode={urlState.sortMode}
      focusedChallengeId={urlState.focusedChallengeId}
      {hoveredColumnId}
    />
  </row-content>
{/snippet}

{#snippet skeletonRow()}
  <row-team></row-team>
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

<scores-shell
  style:--score-content-width={`${contentWidth}px`}
  data-fade-top={fades.top || undefined}
  data-fade-bottom={fades.bottom || undefined}
  data-fade-left={fadeLeft || undefined}
  data-fade-right={fadeRight || undefined}
  data-self-edge={selfEdge ?? undefined}
>
  <mobile-graph>
    {@render graphPanel()}
  </mobile-graph>

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <scores-scroll
    {@attach virtual.scrollContainer}
    {@attach captureScroll}
    tabindex="-1"
    onpointermove={handlePointerMove}
    onpointerleave={clearHover}
  >
    <scores-table>
      <header-row>
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
              focusedChallengeId={urlState.focusedChallengeId}
              onFocus={focusChallenge}
              {hoveredColumnId}
            />
          {/if}
        </header-content>
      </header-row>

      {#if selfEdge === 'top' && selfRow}
        <ScoresSelfRow
          {data}
          entry={selfRow.entry}
          index={selfRow.index}
          edge="top"
          viewMode={urlState.viewMode}
          sortMode={urlState.sortMode}
          focusedChallengeId={urlState.focusedChallengeId}
          {divisions}
          {showDivision}
          {hoveredColumnId}
        />
      {/if}

      <virtual-list style:block-size={`${virtual.totalSize}px`}>
        {#each virtual.virtualItems as item (item.key)}
          {@const entry = data.entries[item.index]}
          <virtual-row
            data-loading={entry ? undefined : true}
            data-team-id={entry?.id}
            style:--row-y={`${item.start - headerOffset}px`}
          >
            {#if entry}
              {@render teamRow(entry, item.index)}
            {:else}
              {@render skeletonRow()}
            {/if}
          </virtual-row>
        {/each}
      </virtual-list>

      {#if selfEdge === 'bottom' && selfRow}
        <ScoresSelfRow
          {data}
          entry={selfRow.entry}
          index={selfRow.index}
          edge="bottom"
          viewMode={urlState.viewMode}
          sortMode={urlState.sortMode}
          focusedChallengeId={urlState.focusedChallengeId}
          {divisions}
          {showDivision}
          {hoveredColumnId}
        />
      {/if}
    </scores-table>
  </scores-scroll>

  <ScoresScrollbars root={scrollRoot} {geometry} />

  <edge-fade data-edge="top" aria-hidden="true"></edge-fade>
  <edge-fade data-edge="bottom" aria-hidden="true"></edge-fade>
  <edge-fade data-edge="left" aria-hidden="true"></edge-fade>
  <edge-fade data-edge="right" aria-hidden="true"></edge-fade>

  {#if displayedTooltip}
    <cell-tooltip
      aria-hidden="true"
      data-place={tooltipPlace}
      style:left={`${tooltipX}px`}
      style:top={`${tooltipY}px`}
    >
      <strong data-capitalize={displayedTooltip.capitalize || undefined}>
        {displayedTooltip.title}
      </strong>
      {#each displayedTooltip.lines as line, index (index)}
        <span data-trend={line.trend}>
          {line.text}
          {#if line.icon}
            {#if line.icon.kind === 'blood'}
              <svg viewBox="0 0 24 24" data-icon="blood" data-medal={line.icon.medal}>
                <path fill="currentColor" d={BLOOD_PATHS[line.icon.medal - 1]} />
              </svg>
            {:else}
              <svg viewBox="0 0 24 24" data-icon="solved">
                <circle cx="12" cy="12" r="10.5" />
              </svg>
            {/if}
            {line.iconLabel}
          {/if}
        </span>
      {/each}
    </cell-tooltip>
  {/if}
</scores-shell>

<style>
  scores-shell {
    --score-row-gap: 4px;
    --score-row-height-full: 68px;
    --score-row-height: calc(var(--score-row-height-full) - var(--score-row-gap));
    --score-header-height: 192px;
    --score-name-row-height: 128px;
    --score-diagonal-overflow: 96px;
    --score-team-column-width: 100%;
    --score-mobile-graph-height: 12rem;
    --score-fade-size: 1.5rem;
    --score-fade-inset-top: 0px;
    --score-fade-inset-bottom: 0px;
    --score-fade-region-top: calc(var(--score-mobile-graph-height) + var(--space-3xs));
    --score-fade-rail: 0px;
    position: relative;
    display: flex;
    flex-direction: column;
    min-block-size: 0;
    inline-size: 100%;
    max-inline-size: 100%;

    &[data-self-edge='top'] {
      --score-fade-inset-top: var(--score-row-height-full);
    }

    &[data-self-edge='bottom'] {
      --score-fade-inset-bottom: var(--score-row-height-full);
    }
  }

  edge-fade {
    position: absolute;
    z-index: 20;
    display: block;
    pointer-events: none;
    opacity: 0;
    transition: opacity 150ms ease;

    &[data-edge='top'] {
      inset-block-start: calc(var(--score-fade-region-top) + var(--score-fade-inset-top));
      inset-inline: 0;
      block-size: var(--score-fade-size);
      background: linear-gradient(to bottom, var(--background-l0), transparent);
    }

    &[data-edge='bottom'] {
      inset-block-end: calc(var(--score-fade-rail) + var(--score-fade-inset-bottom));
      inset-inline: 0;
      block-size: var(--score-fade-size);
      background: linear-gradient(to top, var(--background-l0), transparent);
    }

    &[data-edge='left'],
    &[data-edge='right'] {
      display: none;
    }
  }

  scores-shell[data-fade-top] edge-fade[data-edge='top'],
  scores-shell[data-fade-bottom] edge-fade[data-edge='bottom'],
  scores-shell[data-fade-left] edge-fade[data-edge='left'],
  scores-shell[data-fade-right] edge-fade[data-edge='right'] {
    opacity: 1;
  }

  mobile-graph {
    display: block;
    flex-shrink: 0;
    block-size: var(--score-mobile-graph-height);
    margin-block-end: var(--space-3xs);
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
    overscroll-behavior: none;
    scrollbar-width: none;
  }

  scores-table {
    display: flex;
    flex-direction: column;
    position: relative;
    min-block-size: 100%;
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

    &:has(:global(a:focus-visible)) {
      outline: 2px solid var(--ring);
      outline-offset: -2px;
      border-radius: var(--radius-lg);
    }
  }

  row-team {
    --rank-fg-l0: var(--foreground-l0);
    --rank-fg-l1: var(--foreground-l3);
    --rank-glow: transparent;
    position: relative;
    z-index: 0;
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    flex-shrink: 0;
    inline-size: var(--score-team-column-width);
    block-size: var(--score-row-height);
    padding-inline: 1rem;
    background: var(--background-l0);

    &::before,
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      z-index: -1;
      border-radius: var(--radius-lg);
    }

    &::before {
      background: var(--background-l2);
    }

    &[data-hovered]::before {
      background: color-mix(in oklab, var(--foreground-l0) 4%, var(--background-l2));
    }

    &[data-ranked]::after {
      inline-size: min(24rem, 100%);
      background: linear-gradient(to right, var(--rank-glow), transparent);
    }

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

    &[data-current]::before {
      background: var(--background-self-l0);
    }
  }

  row-content {
    display: none;
  }

  @media (width >= 48rem) {
    scores-shell {
      --score-team-column-width: min(60vw - 4.5rem, 26rem);
      --score-fade-region-top: var(--score-header-height);
      --score-fade-rail: 0.5rem;
      inline-size: fit-content;
      margin-inline: auto;
      padding-block-end: var(--score-fade-rail);
    }

    edge-fade[data-edge='left'],
    edge-fade[data-edge='right'] {
      display: block;
      inset-block-start: 0;
      inset-block-end: var(--score-fade-rail);
      inline-size: var(--score-fade-size);
    }

    edge-fade[data-edge='left'] {
      inset-inline-start: var(--score-team-column-width);
      background: linear-gradient(to right, var(--background-l0), transparent);
    }

    edge-fade[data-edge='right'] {
      inset-inline-end: 0;
      background: linear-gradient(to left, var(--background-l0), transparent);
    }

    mobile-graph {
      display: none;
    }

    scores-table {
      inline-size: max-content;
      min-inline-size: 100%;
    }

    header-row {
      display: flex;
      position: sticky;
      inset-block-start: 0;
      z-index: 20;
      block-size: var(--score-header-height);
      background: var(--background-l0);
    }

    header-corner {
      position: sticky;
      inset-inline-start: 0;
      z-index: 1;
      flex-shrink: 0;
      inline-size: var(--score-team-column-width);
      block-size: 100%;
      background: var(--background-l0);
    }

    graph-panel {
      display: block;
      block-size: 100%;
      background: var(--background-l1);
      border-start-start-radius: var(--radius-lg);
      border-start-end-radius: var(--radius-lg);
      border-end-start-radius: var(--radius-lg);
      overflow: hidden;
    }

    header-content {
      display: block;
      flex: 1;
      block-size: 100%;
      inline-size: max-content;
    }

    virtual-list {
      inline-size: 100%;
    }

    virtual-row {
      inline-size: auto;
    }

    row-team {
      position: sticky;
      inset-inline-start: 0;
      z-index: 10;

      &::before,
      &::after {
        border-start-end-radius: 0;
        border-end-end-radius: 0;
      }
    }

    row-content {
      display: block;
      flex-shrink: 0;
      inline-size: var(--score-content-width);
      block-size: var(--score-row-height);
      background: var(--background-l2);
      border-start-end-radius: var(--radius-lg);
      border-end-end-radius: var(--radius-lg);

      &[data-hovered] {
        background: color-mix(in oklab, var(--foreground-l0) 4%, var(--background-l2));
      }

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
    max-inline-size: 16rem;
    padding: 0.375rem 0.625rem;
    background: var(--background-l2);
    border: 2px solid var(--border);
    border-radius: var(--radius-sm);
    pointer-events: none;
    line-height: 1.35;
    translate: -50% calc(-100% - 0.625rem);

    &[data-place='bottom'] {
      translate: -50% 0.625rem;
    }

    &::after {
      content: '';
      position: absolute;
      inset-inline-start: 50%;
      inline-size: 0.625rem;
      block-size: 0.625rem;
      background: var(--background-l2);
      translate: -50%;
      rotate: 45deg;
    }

    &[data-place='top']::after {
      inset-block-end: -0.4375rem;
      border-inline-end: 2px solid var(--border);
      border-block-end: 2px solid var(--border);
    }

    &[data-place='bottom']::after {
      inset-block-start: -0.4375rem;
      border-inline-start: 2px solid var(--border);
      border-block-start: 2px solid var(--border);
    }

    strong {
      color: var(--foreground-l1);
      font-size: var(--step--2);
      font-weight: 400;

      &[data-capitalize] {
        text-transform: capitalize;
      }
    }

    span {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      color: var(--foreground-l3);
      font-size: var(--step--2);
      white-space: nowrap;

      &[data-trend='positive'] {
        color: var(--foreground-success);
      }

      &[data-trend='negative'] {
        color: var(--foreground-destructive);
      }
    }

    svg[data-icon] {
      inline-size: 0.875rem;
      block-size: 0.875rem;
    }

    svg[data-icon='solved'] circle {
      fill: none;
      stroke: color-mix(in oklab, var(--foreground-success) 75%, transparent);
      stroke-width: 3;
    }

    svg[data-icon='blood'][data-medal='1'] {
      color: var(--foreground-gold-l0);
    }

    svg[data-icon='blood'][data-medal='2'] {
      color: var(--foreground-silver-l0);
    }

    svg[data-icon='blood'][data-medal='3'] {
      color: var(--foreground-bronze-l0);
    }
  }

  @media (width >= 80rem) {
    scores-shell {
      --score-team-column-width: clamp(36rem, 45vw - 4.5rem, 44rem);
    }
  }
</style>

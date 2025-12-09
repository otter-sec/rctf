<script lang="ts">
  import { ScrollArea } from '$lib/components'
  import { useCurrentUser, useLeaderboardGraph, useSelfUserGraph } from '$lib/query'
  import { cn } from '$lib/utils'
  import {
    buildSolvesMap,
    getContentWidth,
    groupByCategory,
    processChallenges,
  } from './utils'
  import { 
    CUTOFF_TIME,
    FADE_SIZE,
    PAGE_SIZE,
    layout
  } from './constants'
  import type {
    ChallengesData,
    LeaderboardEntry,
    SortMode,
    TooltipData,
    ViewMode,
  } from './types'
  import Fade from './scores-fade.svelte'
  import Header from './scores-header.svelte'
  import Row from './scores-row.svelte'
  import SelfRow from './scores-self-row.svelte'
  import Tooltip from './scores-tooltip.svelte'

  interface Props {
    entries: LeaderboardEntry[]
    challengesData: ChallengesData
    page: number
    sortMode: SortMode
    viewMode: ViewMode
    isFetching?: boolean
  }

  let { entries, challengesData, page, sortMode, viewMode, isFetching = false }: Props = $props()

  const userQuery = useCurrentUser()
  const currentUser = $derived($userQuery.data)
  const globalPlace = $derived(currentUser?.globalPlace ?? null)

  const selfIsOnCurrentPage = $derived.by(() => {
    if (!globalPlace) return true
    const startRank = (page - 1) * PAGE_SIZE + 1
    const endRank = page * PAGE_SIZE
    return globalPlace >= startRank && globalPlace <= endRank
  })

  const showSelfRow = $derived(currentUser && globalPlace && !selfIsOnCurrentPage)

  const selfSolves = $derived.by(() => {
    if (!currentUser) return new Map<string, { id: string; solveTime: number }>()
    return new Map(currentUser.solves.map(s => [s.id, { id: s.id, solveTime: s.createdAt }]))
  })

  const graphQuery = $derived(
    useLeaderboardGraph({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, division: 'open' })
  )
  const selfGraphQuery = $derived(useSelfUserGraph(selfIsOnCurrentPage ? null : globalPlace))

  const SPARKLINE_WINDOW = 60 * 60 * 1000 * 12

  const sparklineDataByTeam = $derived.by(() => {
    const graphData = $graphQuery.data ?? []
    const selfGraphData = $selfGraphQuery.data

    const allPoints: { time: number; score: number }[][] = []

    for (const team of graphData) {
      const filtered = team.points
        .filter(p => p.time <= CUTOFF_TIME)
        .map(p => ({ time: p.time, score: p.score }))
      allPoints.push(filtered)
    }

    if (selfGraphData) {
      const filtered = selfGraphData.points
        .filter(p => p.time <= CUTOFF_TIME)
        .map(p => ({ time: p.time, score: p.score }))
      allPoints.push(filtered)
    }

    const maxTime = Math.max(...allPoints.flatMap(pts => pts.map(p => p.time)))
    const windowStart = maxTime - SPARKLINE_WINDOW

    const result = new Map<string, { time: number; score: number }[]>()

    for (const team of graphData) {
      const filtered = team.points
        .filter(p => p.time >= windowStart && p.time <= CUTOFF_TIME)
        .map(p => ({ time: p.time, score: p.score }))
      result.set(team.id, filtered)
    }

    if (selfGraphData && !result.has(selfGraphData.id)) {
      const filtered = selfGraphData.points
        .filter(p => p.time >= windowStart && p.time <= CUTOFF_TIME)
        .map(p => ({ time: p.time, score: p.score }))
      result.set(selfGraphData.id, filtered)
    }

    return result
  })

  let viewportRef = $state<HTMLElement | null>(null)
  let showTopFade = $state(false)
  let showBottomFade = $state(true)
  let showLeftFade = $state(false)
  let showRightFade = $state(true)
  let hoveredTeamId = $state<string | null>(null)
  let tooltipData = $state<TooltipData | null>(null)
  let tooltipX = $state(0)
  let tooltipY = $state(0)

  const challengesByCategory = $derived(processChallenges(challengesData))
  const challenges = $derived(
    sortMode === 'solves'
      ? [...challengesByCategory].sort(
          (a, b) => a.solves - b.solves || a.name.localeCompare(b.name)
        )
      : challengesByCategory
  )
  const categoryGroups = $derived(groupByCategory(challengesByCategory))
  const solvesByTeam = $derived(buildSolvesMap(entries))

  const isMinimal = $derived(viewMode === 'minimal')

  const cells = $derived(
    viewMode === 'boomer'
      ? categoryGroups.map(g => ({ name: g.config.name }))
      : challenges.map(c => ({ name: c.name }))
  )
  const contentWidth = $derived(getContentWidth(cells, viewMode))

  let hoverTimeout: ReturnType<typeof setTimeout> | null = null

  function handleCellHover(data: TooltipData | null, x: number, y: number) {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      hoverTimeout = null
    }

    if (data) {
      hoverTimeout = setTimeout(() => {
        hoveredTeamId = data.teamId
        tooltipData = data
        tooltipX = x
        tooltipY = y
      }, 300)
    } else {
      hoveredTeamId = null
      tooltipData = null
    }
  }

  function updateFades() {
    const v = viewportRef
    if (!v) return

    const threshold = 10
    showTopFade = v.scrollTop > threshold
    showBottomFade = v.scrollTop + v.clientHeight < v.scrollHeight - threshold
    showLeftFade = v.scrollLeft > threshold
    showRightFade = v.scrollLeft + v.clientWidth < v.scrollWidth - threshold
  }

  $effect(() => {
    const v = viewportRef
    if (!v) return

    updateFades()
    v.addEventListener('scroll', updateFades, { passive: true })
    const observer = new ResizeObserver(updateFades)
    observer.observe(v)

    return () => {
      v.removeEventListener('scroll', updateFades)
      observer.disconnect()
    }
  })
</script>

<div class="flex justify-center">
  <div
    class={cn('relative max-w-full', isMinimal ? 'w-full max-w-3xl' : '')}
    style:width={isMinimal ? undefined : `${contentWidth}px`}
  >
    <Fade
      teamColWidth={isMinimal ? 0 : layout.teamColumn}
      headerHeight={layout.headerHeight}
      fadeSize={FADE_SIZE}
      bottomOffset={showSelfRow ? layout.selfRowHeight : 0}
      {showTopFade}
      {showBottomFade}
      showLeftFade={isMinimal ? false : showLeftFade}
      showRightFade={isMinimal ? false : showRightFade}
      showSelfRow={!!showSelfRow}
    />

    <ScrollArea
      class="h-[calc(100vh-142px)] max-w-full rounded-lg"
      orientation="both"
      fadeSize={0}
      scrollbarXClasses="z-50"
      scrollbarXStyles={isMinimal ? '' : `margin-left: ${layout.teamColumn}px;`}
      scrollbarYClasses="z-50"
      scrollbarYStyles="margin-top: {layout.headerHeight}px; height: calc(100% - {layout.headerHeight}px);"
      bind:viewportRef
    >
      <div
        class={isMinimal ? 'w-full' : ''}
        style:width={isMinimal ? undefined : `${contentWidth}px`}
      >
        <Header
          {challenges}
          {categoryGroups}
          {hoveredTeamId}
          {sortMode}
          {viewMode}
          {isFetching}
          graphOffset={(page - 1) * PAGE_SIZE}
          teamColWidth={layout.teamColumn}
          cellWidth={layout.cell}
          nameRowHeight={layout.nameRowHeight}
          headerHeight={layout.headerHeight}
          solveHighlight={tooltipData?.solved && tooltipData.solveTime
            ? { teamId: tooltipData.teamId, time: tooltipData.solveTime }
            : null}
        />

        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="flex flex-col gap-1"
          onmouseleave={() => {
            hoveredTeamId = null
            tooltipData = null
          }}
        >
          {#each entries as entry, index (entry.id)}
            {@const rank = (page - 1) * PAGE_SIZE + index + 1}
            <Row
              {entry}
              {rank}
              {challenges}
              {categoryGroups}
              solves={solvesByTeam.get(entry.id)!}
              {sortMode}
              {viewMode}
              isCurrentUser={currentUser?.id === entry.id}
              teamColWidth={layout.teamColumn}
              sparklineData={sparklineDataByTeam.get(entry.id) ?? []}
              {page}
              onHover={() => (hoveredTeamId = entry.id)}
              onUnhover={() => (hoveredTeamId = null)}
              onCellHover={handleCellHover}
            />
          {/each}
        </div>

        {#if showSelfRow && currentUser && globalPlace && !isFetching}
          <div class="sticky bottom-0 z-20 bg-background-l0/95 pt-2 pb-2 backdrop-blur-sm">
            <SelfRow
              user={currentUser}
              rank={globalPlace}
              {challenges}
              {categoryGroups}
              solves={selfSolves}
              {sortMode}
              {viewMode}
              teamColWidth={layout.teamColumn}
              sparklineData={sparklineDataByTeam.get(currentUser.id) ?? []}
              {page}
              onHover={() => (hoveredTeamId = currentUser.id)}
              onUnhover={() => (hoveredTeamId = null)}
              onCellHover={handleCellHover}
            />
          </div>
        {/if}
      </div>
    </ScrollArea>
  </div>
</div>

<Tooltip data={tooltipData} x={tooltipX} y={tooltipY} />

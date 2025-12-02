<script lang="ts">
  import { ScrollArea } from '$lib/components'
  import { useCurrentUser } from '$lib/query'
  import Fade from './scores-fade.svelte'
  import Header from './scores-header.svelte'
  import Row from './scores-row.svelte'
  import Tooltip from './scores-tooltip.svelte'
  import {
    buildSolvesMap,
    CELL_WIDTH,
    FADE_SIZE,
    groupByCategory,
    HEADER_HEIGHT,
    NAME_ROW_HEIGHT,
    PAGE_SIZE,
    processChallenges,
    TEAM_COL_WIDTH,
    type ChallengesData,
    type LeaderboardEntry,
    type SortMode,
    type TooltipData,
    type ViewMode,
  } from './types'

  interface Props {
    entries: LeaderboardEntry[]
    challengesData: ChallengesData
    page: number
    sortMode: SortMode
    viewMode: ViewMode
    isFetching?: boolean
  }

  let {
    entries,
    challengesData,
    page,
    sortMode,
    viewMode,
    isFetching = false,
  }: Props = $props()

  const userQuery = useCurrentUser()

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
  const categoryGroupsBase = $derived(groupByCategory(challengesByCategory))
  const categoryGroups = $derived(
    sortMode === 'solves'
      ? [...categoryGroupsBase].sort((a, b) => {
          const avgA =
            a.challenges.reduce((sum, c) => sum + c.solves, 0) /
            a.challenges.length
          const avgB =
            b.challenges.reduce((sum, c) => sum + c.solves, 0) /
            b.challenges.length
          return avgA - avgB || a.category.localeCompare(b.category)
        })
      : categoryGroupsBase
  )
  const solvesByTeam = $derived(buildSolvesMap(entries))

  function handleCellHover(data: TooltipData | null, x: number, y: number) {
    tooltipData = data
    tooltipX = x
    tooltipY = y
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
  <div class="relative w-max max-w-full">
    <Fade
      teamColWidth={TEAM_COL_WIDTH}
      headerHeight={HEADER_HEIGHT}
      fadeSize={FADE_SIZE}
      {showTopFade}
      {showBottomFade}
      {showLeftFade}
      {showRightFade}
    />

    <ScrollArea
      class="h-[calc(100vh-142px)] w-max max-w-full rounded-lg"
      orientation="both"
      fadeSize={0}
      scrollbarXClasses="z-50"
      scrollbarXStyles="margin-left: {TEAM_COL_WIDTH}px;"
      scrollbarYClasses="z-50"
      scrollbarYStyles="margin-top: {HEADER_HEIGHT}px; height: calc(100% - {HEADER_HEIGHT}px);"
      bind:viewportRef
    >
      <div class="w-max">
        <Header
          {challenges}
          {categoryGroups}
          {hoveredTeamId}
          {sortMode}
          {viewMode}
          {isFetching}
          graphOffset={(page - 1) * PAGE_SIZE}
          teamColWidth={TEAM_COL_WIDTH}
          cellWidth={CELL_WIDTH}
          nameRowHeight={NAME_ROW_HEIGHT}
          headerHeight={HEADER_HEIGHT}
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
              isCurrentUser={$userQuery.data?.id === entry.id}
              teamColWidth={TEAM_COL_WIDTH}
              onHover={() => (hoveredTeamId = entry.id)}
              onCellHover={handleCellHover}
            />
          {/each}
        </div>
      </div>
    </ScrollArea>
  </div>
</div>

<Tooltip data={tooltipData} x={tooltipX} y={tooltipY} />

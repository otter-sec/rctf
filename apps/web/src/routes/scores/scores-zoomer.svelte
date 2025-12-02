<script lang="ts">
  import { ScrollArea } from '$lib/components'
  import { useCurrentUser } from '$lib/query'
  import Fade from './scores-zoomer-fade.svelte'
  import Header from './scores-zoomer-header.svelte'
  import Row from './scores-zoomer-row.svelte'
  import Tooltip from './scores-zoomer-tooltip.svelte'
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
  } from './types'

  interface Props {
    entries: LeaderboardEntry[]
    challengesData: ChallengesData
    page: number
    sortMode: SortMode
    onSortChange: (mode: SortMode) => void
  }

  let { entries, challengesData, page, sortMode }: Props = $props()

  const userQuery = useCurrentUser()

  let viewportRef = $state<HTMLElement | null>(null)
  let showTopFade = $state(false)
  let showBottomFade = $state(false)
  let showLeftFade = $state(false)
  let showRightFade = $state(false)
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
  class="h-[calc(100vh-142px)] rounded-lg"
  orientation="both"
  fadeSize={0}
  scrollbarXClasses="z-50"
  scrollbarXStyles="margin-left: {TEAM_COL_WIDTH}px;"
  scrollbarYClasses="z-50"
  scrollbarYStyles="margin-top: {HEADER_HEIGHT}px; height: calc(100% - {HEADER_HEIGHT}px);"
  bind:viewportRef
>
  <Header
    {challenges}
    {categoryGroups}
    {hoveredTeamId}
    {sortMode}
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
        isCurrentUser={$userQuery.data?.id === entry.id}
        teamColWidth={TEAM_COL_WIDTH}
        onHover={() => (hoveredTeamId = entry.id)}
        onCellHover={handleCellHover}
      />
    {/each}
  </div>
</ScrollArea>

<Tooltip data={tooltipData} x={tooltipX} y={tooltipY} />


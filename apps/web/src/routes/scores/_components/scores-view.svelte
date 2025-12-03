<script lang="ts">
  import { ScrollArea } from '$lib/components'
  import { useCurrentUser } from '$lib/query'
  import {
    buildSolvesMap,
    FADE_SIZE,
    getContentWidth,
    groupByCategory,
    layout,
    PAGE_SIZE,
    processChallenges,
    type ChallengesData,
    type LeaderboardEntry,
    type SortMode,
    type TooltipData,
    type ViewMode,
  } from '../_lib'
  import Fade from './scores-fade.svelte'
  import Header from './scores-header.svelte'
  import Row from './scores-row.svelte'
  import Tooltip from './scores-tooltip.svelte'

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
  const categoryGroups = $derived(groupByCategory(challengesByCategory))
  const solvesByTeam = $derived(buildSolvesMap(entries))

  const cells = $derived(
    viewMode === 'boomer'
      ? categoryGroups.map(g => ({ name: g.config.name }))
      : challenges.map(c => ({ name: c.name }))
  )
  const contentWidth = $derived(getContentWidth(cells, viewMode))

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
  <div class="relative max-w-full" style:width="{contentWidth}px">
    <Fade
      teamColWidth={layout.teamColumn}
      headerHeight={layout.headerHeight}
      fadeSize={FADE_SIZE}
      {showTopFade}
      {showBottomFade}
      {showLeftFade}
      {showRightFade}
    />

    <ScrollArea
      class="h-[calc(100vh-142px)] max-w-full rounded-lg"
      orientation="both"
      fadeSize={0}
      scrollbarXClasses="z-50"
      scrollbarXStyles="margin-left: {layout.teamColumn}px;"
      scrollbarYClasses="z-50"
      scrollbarYStyles="margin-top: {layout.headerHeight}px; height: calc(100% - {layout.headerHeight}px);"
      bind:viewportRef
    >
      <div style:width="{contentWidth}px">
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
              teamColWidth={layout.teamColumn}
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

<script lang="ts">
  import { ScrollArea } from '$lib/components'
  import { useCurrentUser } from '$lib/query'
  import { getCategoryConfig, getCategoryOrder } from '$lib/utils/categories'
  import Fade from './scores-table-fade.svelte'
  import Header from './scores-table-header.svelte'
  import Row from './scores-table-row.svelte'
  import SharedTooltip from './scores-table-tooltip.svelte'
  import {
    CELL_WIDTH,
    FADE_SIZE,
    HEADER_HEIGHT,
    NAME_ROW_HEIGHT,
    PAGE_SIZE,
    TEAM_COL_WIDTH,
    type CategoryGroup,
    type Challenge,
    type LeaderboardEntry,
    type SortMode,
    type TooltipData,
  } from './types'

  interface Props {
    entries: LeaderboardEntry[]
    challengesData: Record<
      string,
      {
        name: string
        category: string
        points: number
        solves: number
        firstSolvers?: { id: string }[]
      }
    >
    page: number
    sortMode: SortMode
    onSortChange: (mode: SortMode) => void
  }

  let { entries, challengesData, page, sortMode, onSortChange }: Props =
    $props()

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

  const challengesByCategory = $derived.by((): Challenge[] => {
    if (!challengesData) return []

    const mapped = Object.entries(challengesData).map(([id, info]) => {
      const config = getCategoryConfig(info.category)
      return {
        id,
        ...info,
        order: getCategoryOrder(info.category),
        config,
      }
    })

    return mapped.sort((a, b) => {
      if (a.order !== b.order) {
        if (a.order === -1 && b.order === -1)
          return a.category.localeCompare(b.category)
        if (a.order === -1) return 1
        if (b.order === -1) return -1
        return a.order - b.order
      }
      if (a.category !== b.category) return a.category.localeCompare(b.category)
      return b.points - a.points || a.name.localeCompare(b.name)
    })
  })

  const challenges = $derived.by((): Challenge[] => {
    if (sortMode === 'solves') {
      return [...challengesByCategory].sort(
        (a, b) => a.solves - b.solves || a.name.localeCompare(b.name)
      )
    }
    return challengesByCategory
  })

  const categoryGroups = $derived.by((): CategoryGroup[] => {
    const groups: CategoryGroup[] = []

    for (const challenge of challengesByCategory) {
      const last = groups.at(-1)
      if (last?.category === challenge.category) {
        last.challenges.push(challenge)
      } else {
        groups.push({
          category: challenge.category,
          config: challenge.config,
          challenges: [challenge],
        })
      }
    }
    return groups
  })

  const solvesByTeam = $derived(
    new Map(entries.map(e => [e.id, new Map(e.solves.map(s => [s.id, s]))]))
  )

  function handleCellHover(data: TooltipData | null, x: number, y: number) {
    tooltipData = data
    tooltipX = x
    tooltipY = y
  }

  function updateFades() {
    const viewport = viewportRef
    if (!viewport) return

    const {
      scrollTop,
      scrollHeight,
      clientHeight,
      scrollLeft,
      scrollWidth,
      clientWidth,
    } = viewport
    const threshold = 10

    showTopFade = scrollTop > threshold
    showBottomFade = scrollTop + clientHeight < scrollHeight - threshold
    showLeftFade = scrollLeft > threshold
    showRightFade = scrollLeft + clientWidth < scrollWidth - threshold
  }

  $effect(() => {
    const viewport = viewportRef
    if (!viewport) return

    updateFades()
    viewport.addEventListener('scroll', updateFades, { passive: true })
    const resizeObserver = new ResizeObserver(updateFades)
    resizeObserver.observe(viewport)

    return () => {
      viewport.removeEventListener('scroll', updateFades)
      resizeObserver.disconnect()
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
      {@const solves = solvesByTeam.get(entry.id)!}
      <Row
        {entry}
        {rank}
        {challenges}
        {solves}
        {sortMode}
        isCurrentUser={$userQuery.data?.id === entry.id}
        teamColWidth={TEAM_COL_WIDTH}
        onHover={() => (hoveredTeamId = entry.id)}
        onCellHover={handleCellHover}
      />
    {/each}
  </div>
</ScrollArea>

<SharedTooltip data={tooltipData} x={tooltipX} y={tooltipY} />

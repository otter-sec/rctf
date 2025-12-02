<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query'
  import { toast } from '$lib'
  import { ScrollArea, Spinner } from '$lib/components'
  import {
    leaderboardQueryOptions,
    useCurrentUser,
    useLeaderboard,
  } from '$lib/query'
  import { cn } from '$lib/utils'
  import { getCategoryConfig, getCategoryOrder } from '$lib/utils/categories'
  import Fade from './scores-table-fade.svelte'
  import Header from './scores-table-header.svelte'
  import Pagination from './scores-table-pagination.svelte'
  import Row from './scores-table-row.svelte'
  import {
    CELL_WIDTH,
    FADE_SIZE,
    HEADER_HEIGHT,
    NAME_ROW_HEIGHT,
    PAGE_SIZE,
    TEAM_COL_WIDTH,
    type CategoryGroup,
    type Challenge,
  } from './types'

  const queryClient = useQueryClient()
  const userQuery = useCurrentUser()

  let page = $state(1)
  let viewportRef = $state<HTMLElement | null>(null)
  let showTopFade = $state(false)
  let showBottomFade = $state(false)
  let showLeftFade = $state(false)
  let showRightFade = $state(false)
  let hoveredTeamId = $state<string | null>(null)

  const leaderboardQuery = $derived(
    useLeaderboard({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      division: 'open',
    })
  )

  const data = $derived($leaderboardQuery.data)
  const entries = $derived(data?.leaderboard ?? [])
  const totalPages = $derived(Math.ceil((data?.total ?? 0) / PAGE_SIZE))
  const isRefetching = $derived(
    $leaderboardQuery.isFetching && !$leaderboardQuery.isPending
  )

  const challenges = $derived.by((): Challenge[] => {
    if (!data?.challenges) return []

    return Object.entries(data.challenges)
      .map(([id, info]) => {
        const config = getCategoryConfig(info.category)
        return {
          id,
          ...info,
          order: getCategoryOrder(info.category),
          config,
        }
      })
      .sort((a, b) => {
        if (a.order !== b.order) {
          if (a.order === -1 && b.order === -1)
            return a.category.localeCompare(b.category)
          if (a.order === -1) return 1
          if (b.order === -1) return -1
          return a.order - b.order
        }
        if (a.category !== b.category)
          return a.category.localeCompare(b.category)
        return b.points - a.points || a.name.localeCompare(b.name)
      })
  })

  const categoryGroups = $derived.by((): CategoryGroup[] => {
    const groups: CategoryGroup[] = []

    for (const challenge of challenges) {
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

  function handlePageChange(newPage: number) {
    page = newPage
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

  $effect(() => {
    for (const p of [page - 1, page + 1]) {
      if (p >= 1 && p <= totalPages) {
        queryClient.prefetchQuery(
          leaderboardQueryOptions({
            limit: PAGE_SIZE,
            offset: (p - 1) * PAGE_SIZE,
            division: 'open',
          })
        )
      }
    }
  })

  $effect(() => {
    if ($leaderboardQuery.isError) {
      toast.error(
        $leaderboardQuery.error?.message ?? 'Failed to load leaderboard'
      )
    }
  })
</script>

<div class="flex flex-col px-9">
  <Pagination
    {page}
    {totalPages}
    {isRefetching}
    onPageChange={handlePageChange}
  />

  <div class={cn('relative', $leaderboardQuery.isFetching && 'opacity-50')}>
    {#if $leaderboardQuery.isLoading}
      <div
        class="absolute inset-0 z-50 flex items-center justify-center bg-background/60"
      >
        <Spinner class="size-6" />
      </div>
    {/if}

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
        graphOffset={(page - 1) * PAGE_SIZE}
        teamColWidth={TEAM_COL_WIDTH}
        cellWidth={CELL_WIDTH}
        nameRowHeight={NAME_ROW_HEIGHT}
        headerHeight={HEADER_HEIGHT}
      />

      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="flex flex-col gap-1"
        onmouseleave={() => (hoveredTeamId = null)}
      >
        {#each entries as entry, index (entry.id)}
          {@const rank = (page - 1) * PAGE_SIZE + index + 1}
          {@const solves = solvesByTeam.get(entry.id)!}
          <Row
            {entry}
            {rank}
            {challenges}
            {solves}
            isCurrentUser={$userQuery.data?.id === entry.id}
            teamColWidth={TEAM_COL_WIDTH}
            onHover={() => (hoveredTeamId = entry.id)}
          />
        {/each}
      </div>
    </ScrollArea>
  </div>
</div>

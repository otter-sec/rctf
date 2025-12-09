<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { page as pageState } from '$app/state'
  import { toast } from '$lib'
  import { Spinner } from '$lib/components'
  import {
    leaderboardWithGraphQueryOptions,
    useLeaderboardChallenges,
    useLeaderboardWithGraph,
  } from '$lib/query'
  import { cn } from '$lib/utils'
  import { PAGE_SIZE } from './constants'
  import ScoresPagination from './scores-header-options.svelte'
  import ScoresView from './scores.svelte'
  import { type SortMode, type ViewMode } from './types'

  const queryClient = useQueryClient()

  const page = $derived.by(() => {
    const raw = pageState.url.searchParams.get('page')
    if (!raw) return 1
    const n = parseInt(raw, 10)
    return isNaN(n) || n < 1 ? 1 : n
  })

  const sortMode = $derived.by(() => {
    const raw = pageState.url.searchParams.get('sort')
    return (raw === 'solves' ? 'solves' : 'category') as SortMode
  })

  const viewMode = $derived.by(() => {
    const raw = pageState.url.searchParams.get('view')
    if (raw === 'boomer') return 'boomer' as ViewMode
    if (raw === 'minimal') return 'minimal' as ViewMode
    return 'zoomer' as ViewMode
  })

  function setUrlParam(key: string, value: string | number, defaultValue: string | number) {
    const url = new URL(pageState.url)
    if (value === defaultValue) {
      url.searchParams.delete(key)
    } else {
      url.searchParams.set(key, String(value))
    }
    goto(url.toString(), {
      replaceState: true,
      keepFocus: true,
      noScroll: true,
    })
  }

  const leaderboardQuery = $derived(
    useLeaderboardWithGraph({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    })
  )

  const challengesQuery = $derived(useLeaderboardChallenges())

  const data = $derived($leaderboardQuery.data)
  const entries = $derived(data?.leaderboard ?? [])
  const graphData = $derived(data?.graph ?? [])
  const challengesData = $derived($challengesQuery.data ?? {})
  const isRefetching = $derived(
    ($leaderboardQuery.isFetching && !$leaderboardQuery.isPending) ||
      ($challengesQuery.isFetching && !$challengesQuery.isPending)
  )

  let lastKnownTotalPages = $state(1)
  $effect(() => {
    if (data?.total !== undefined) {
      lastKnownTotalPages = Math.ceil(data.total / PAGE_SIZE)
    }
  })
  const totalPages = $derived(
    data?.total !== undefined ? Math.ceil(data.total / PAGE_SIZE) : lastKnownTotalPages
  )

  $effect(() => {
    for (const p of [page - 1, page + 1]) {
      if (p >= 1 && p <= totalPages) {
        queryClient.prefetchQuery(
          leaderboardWithGraphQueryOptions({
            limit: PAGE_SIZE,
            offset: (p - 1) * PAGE_SIZE,
          })
        )
      }
    }
  })

  $effect(() => {
    if ($leaderboardQuery.isError) {
      toast.error($leaderboardQuery.error?.message ?? 'Failed to load leaderboard')
    }
    if ($challengesQuery.isError) {
      toast.error($challengesQuery.error?.message ?? 'Failed to load challenges')
    }
  })
</script>

<div class="flex flex-col px-9">
  <ScoresPagination
    {page}
    {totalPages}
    {isRefetching}
    {sortMode}
    {viewMode}
    onPageChange={p => setUrlParam('page', p, 1)}
    onSortChange={m => setUrlParam('sort', m, 'category')}
    onViewChange={m => setUrlParam('view', m, 'zoomer')}
  />

  <div class={cn('relative', $leaderboardQuery.isFetching && 'opacity-50')}>
    {#if $leaderboardQuery.isLoading || $challengesQuery.isLoading}
      <div class="bg-background/60 absolute inset-0 z-50 flex items-center justify-center">
        <Spinner class="size-6" />
      </div>
    {/if}

    <ScoresView
      {entries}
      {graphData}
      {challengesData}
      {page}
      {sortMode}
      {viewMode}
      isFetching={$leaderboardQuery.isFetching}
    />
  </div>
</div>

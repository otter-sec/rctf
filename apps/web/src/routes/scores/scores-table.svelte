<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query'
  import { toast } from '$lib'
  import { Spinner } from '$lib/components'
  import { leaderboardQueryOptions, useLeaderboard } from '$lib/query'
  import { cn } from '$lib/utils'
  import BoomerView from './scores-boomer-view.svelte'
  import Pagination from './scores-table-pagination.svelte'
  import ZoomerView from './scores-zoomer-view.svelte'
  import { PAGE_SIZE, type SortMode, type ViewMode } from './types'

  const queryClient = useQueryClient()

  let page = $state(1)
  let sortMode = $state<SortMode>('category')
  let viewMode = $state<ViewMode>('zoomer')

  const leaderboardQuery = $derived(
    useLeaderboard({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      division: 'open',
    })
  )

  const data = $derived($leaderboardQuery.data)
  const entries = $derived(data?.leaderboard ?? [])
  const challengesData = $derived(data?.challenges ?? {})
  const totalPages = $derived(Math.ceil((data?.total ?? 0) / PAGE_SIZE))
  const isRefetching = $derived(
    $leaderboardQuery.isFetching && !$leaderboardQuery.isPending
  )

  function handlePageChange(newPage: number) {
    page = newPage
  }

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
    {sortMode}
    {viewMode}
    onPageChange={handlePageChange}
    onSortChange={mode => (sortMode = mode)}
    onViewChange={mode => (viewMode = mode)}
  />

  <div class={cn('relative', $leaderboardQuery.isFetching && 'opacity-50')}>
    {#if $leaderboardQuery.isLoading}
      <div
        class="absolute inset-0 z-50 flex items-center justify-center bg-background/60"
      >
        <Spinner class="size-6" />
      </div>
    {/if}

    {#if viewMode === 'zoomer'}
      <ZoomerView
        {entries}
        {challengesData}
        {page}
        {sortMode}
        onSortChange={mode => (sortMode = mode)}
      />
    {:else}
      <BoomerView {entries} {challengesData} {page} />
    {/if}
  </div>
</div>

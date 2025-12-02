<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query'
  import { toast } from '$lib'
  import { Spinner } from '$lib/components'
  import { leaderboardQueryOptions, useLeaderboard } from '$lib/query'
  import { cn } from '$lib/utils'
  import Pagination from './scores-pagination.svelte'
  import View from './scores-view.svelte'
  import { PAGE_SIZE, type SortMode, type ViewMode } from './types'

  const queryClient = useQueryClient()

  let page = $state(1)
  let sortMode = $state<SortMode>('category')
  let viewMode = $state<ViewMode>('zoomer')

  const query = $derived(
    useLeaderboard({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      division: 'open',
    })
  )

  const data = $derived($query.data)
  const entries = $derived(data?.leaderboard ?? [])
  const challengesData = $derived(data?.challenges ?? {})
  const totalPages = $derived(Math.ceil((data?.total ?? 0) / PAGE_SIZE))
  const isRefetching = $derived($query.isFetching && !$query.isPending)

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
    if ($query.isError) {
      toast.error($query.error?.message ?? 'Failed to load leaderboard')
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
    onPageChange={p => (page = p)}
    onSortChange={m => (sortMode = m)}
    onViewChange={m => (viewMode = m)}
  />

  <div class={cn('relative', $query.isFetching && 'opacity-50')}>
    {#if $query.isLoading}
      <div class="absolute inset-0 z-50 flex items-center justify-center bg-background/60">
        <Spinner class="size-6" />
      </div>
    {/if}

    <View {entries} {challengesData} {page} {sortMode} {viewMode} />
  </div>
</div>

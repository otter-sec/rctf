<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { page as pageState } from '$app/state'
  import { toast } from '$lib'
  import { Spinner } from '$lib/components'
  import { leaderboardQueryOptions, useLeaderboard } from '$lib/query'
  import { cn } from '$lib/utils'
  import { PAGE_SIZE, type SortMode, type ViewMode } from '../_lib'
  import Pagination from './scores-pagination.svelte'
  import View from './scores-view.svelte'

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
    return (raw === 'boomer' ? 'boomer' : 'zoomer') as ViewMode
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
  const isRefetching = $derived($query.isFetching && !$query.isPending)

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
    onPageChange={p => setUrlParam('page', p, 1)}
    onSortChange={m => setUrlParam('sort', m, 'category')}
    onViewChange={m => setUrlParam('view', m, 'zoomer')} />

  <div class={cn('relative', $query.isFetching && 'opacity-50')}>
    {#if $query.isLoading}
      <div class="absolute inset-0 z-50 flex items-center justify-center bg-background/60">
        <Spinner class="size-6" />
      </div>
    {/if}

    <View {entries} {challengesData} {page} {sortMode} {viewMode} isFetching={$query.isFetching} />
  </div>
</div>

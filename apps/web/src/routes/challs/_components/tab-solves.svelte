<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query'
  import { toast } from '$lib'
  import type { Challenge } from '$lib/api'
  import { PaginationControls, RankRow, ScrollArea, SearchInput, Spinner } from '$lib/components'
  import {
    challengeSolvesQueryOptions,
    useChallengeSolves,
    useClientConfig,
    useCurrentUser,
  } from '$lib/query'
  import {
    formatFirstBloodTime,
    formatLocalTime,
    formatRelativeToFirstBlood,
    getRankVariant,
  } from '$lib/utils'

  const PAGE_SIZE = 10

  interface Props {
    challenge: Challenge
    userVisibleInList?: boolean
  }

  let { challenge, userVisibleInList = $bindable(false) }: Props = $props()

  const queryClient = useQueryClient()
  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()

  let page = $state(1)
  let searchQuery = $state('')

  const currentUser = $derived($userQuery.data)
  const clientConfig = $derived($clientConfigQuery.data)
  const ctfStartTime = $derived(clientConfig?.startTime ?? 0)

  const solvesQuery = $derived(
    useChallengeSolves(challenge.id, {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    })
  )

  const solves = $derived($solvesQuery.data?.solves ?? [])
  let storedFirstBloodTime = $state(0)
  $effect(() => {
    if (page === 1 && solves[0]?.createdAt) {
      storedFirstBloodTime = solves[0].createdAt
    }
  })
  const firstBloodTime = $derived(storedFirstBloodTime)
  const totalCount = $derived(challenge.solves ?? 0)
  const totalPages = $derived(Math.ceil(totalCount / PAGE_SIZE))
  const isRefetching = $derived($solvesQuery.isFetching && !$solvesQuery.isPending)

  const filteredSolves = $derived.by(() => {
    if (!searchQuery.trim()) return solves
    const query = searchQuery.toLowerCase()
    return solves.filter(s => s.userName.toLowerCase().includes(query))
  })

  $effect(() => {
    userVisibleInList = currentUser ? solves.some(s => s.userId === currentUser.id) : false
  })

  function handlePageChange(newPage: number) {
    page = newPage
  }

  $effect(() => {
    const prefetchPage = (targetPage: number) => {
      if (targetPage < 1 || targetPage > totalPages) return
      const params = { limit: PAGE_SIZE, offset: (targetPage - 1) * PAGE_SIZE }
      queryClient.prefetchQuery(challengeSolvesQueryOptions(challenge.id, params))
    }

    prefetchPage(page - 1)
    prefetchPage(page + 1)
  })

  $effect(() => {
    if ($solvesQuery.isError) {
      toast.error($solvesQuery.error?.message ?? 'Failed to load solves')
    }
  })
</script>

<div class="flex h-full flex-col">
  <div class="px-5 py-2">
    <div class="flex justify-between gap-1">
      <!-- TODO(enscribe): this only searches one page rather than all solves -->
      <SearchInput
        value={searchQuery}
        onInput={v => (searchQuery = v)}
        variant="rounded"
        class="max-w-sm" />
      <PaginationControls
        {page}
        {totalPages}
        disabled={isRefetching}
        variant="rounded"
        onPageChange={handlePageChange} />
    </div>
  </div>

  <ScrollArea class="min-h-0 flex-1" fadeSize={64} fadeColor="background-l2">
    {#if $solvesQuery.isPending}
      <div class="flex items-center justify-center py-8">
        <Spinner class="size-6" />
      </div>
    {:else if totalCount === 0}
      <p class="text-foreground-l3 text-center py-8">No solves yet</p>
    {:else}
      <div class="flex flex-col gap-2 px-5" class:opacity-50={isRefetching}>
        {#each filteredSolves as solve (solve.id)}
          {@const isCurrentUser = !!(currentUser && solve.userId === currentUser.id)}
          {@const variant = getRankVariant(solve.globalPlace, isCurrentUser)}
          <RankRow
            {variant}
            rankLabel={solve.globalPlace}
            name={solve.userName}
            userId={solve.userId}
            division={solve.division}
            divisionPlace={solve.divisionPlace}
            primaryValue={solve.globalPlace === 1
              ? formatFirstBloodTime(solve.createdAt, ctfStartTime)
              : formatRelativeToFirstBlood(solve.createdAt, firstBloodTime)}
            secondaryValue={formatLocalTime(solve.createdAt)} />
        {/each}
      </div>
    {/if}
  </ScrollArea>
</div>

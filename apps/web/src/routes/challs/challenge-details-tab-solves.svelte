<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query'
  import { toast } from '$lib'
  import type { Challenge } from '$lib/api'
  import { RankRow, ScrollArea, Spinner, Tooltip } from '$lib/components'
  import {
    IconChevronLeft,
    IconChevronLeftPipe,
    IconChevronRight,
    IconChevronRightPipe,
    IconSearch,
  } from '$lib/icons'
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
  const isRefetching = $derived(
    $solvesQuery.isFetching && !$solvesQuery.isPending
  )

  const solvesWithRank = $derived(
    solves.map((solve, index) => ({
      ...solve,
      rank: (page - 1) * PAGE_SIZE + index + 1,
    }))
  )

  const filteredSolves = $derived.by(() => {
    if (!searchQuery.trim()) return solvesWithRank
    const query = searchQuery.toLowerCase()
    return solvesWithRank.filter(s => s.userName.toLowerCase().includes(query))
  })

  $effect(() => {
    userVisibleInList = currentUser
      ? solves.some(s => s.userId === currentUser.id)
      : false
  })

  function handlePageChange(newPage: number) {
    page = newPage
  }

  $effect(() => {
    const prefetchPage = (targetPage: number) => {
      if (targetPage < 1 || targetPage > totalPages) return
      const params = { limit: PAGE_SIZE, offset: (targetPage - 1) * PAGE_SIZE }
      queryClient.prefetchQuery(
        challengeSolvesQueryOptions(challenge.id, params)
      )
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
      <div
        class="flex h-10 max-w-sm flex-1 items-center justify-between rounded-full bg-background-l3 px-4"
      >
        <input
          type="text"
          placeholder="Search..."
          class="w-full bg-transparent text-base outline-none placeholder:text-foreground-l4"
          bind:value={searchQuery}
        />
        <IconSearch class="size-5 shrink-0 text-foreground-l2" />
      </div>
      <div class="flex items-center gap-1">
        <div
          class="flex h-10 items-center whitespace-nowrap px-3 text-sm text-foreground-l3"
        >
          Page {page} / {totalPages || 1}
        </div>
        <div class="flex h-10 gap-1 overflow-hidden rounded-full">
          <Tooltip.Root disableCloseOnTriggerClick>
            <Tooltip.Trigger
              onclick={() => handlePageChange(1)}
              disabled={isRefetching || page === 1}
              class="h-10 rounded-r-sm bg-background-l3 px-3 text-foreground-l2 hover:bg-background-l4 hover:text-foreground-l1 disabled:pointer-events-none disabled:opacity-50"
            >
              <IconChevronLeftPipe class="size-5" />
            </Tooltip.Trigger>
            <Tooltip.Content>First page</Tooltip.Content>
          </Tooltip.Root>
          <Tooltip.Root disableCloseOnTriggerClick>
            <Tooltip.Trigger
              onclick={() => handlePageChange(Math.max(1, page - 1))}
              disabled={isRefetching || page === 1}
              class="h-10 rounded-sm bg-background-l3 px-3 text-foreground-l2 hover:bg-background-l4 hover:text-foreground-l1 disabled:pointer-events-none disabled:opacity-50"
            >
              <IconChevronLeft class="size-5" />
            </Tooltip.Trigger>
            <Tooltip.Content>Previous page</Tooltip.Content>
          </Tooltip.Root>
          <Tooltip.Root disableCloseOnTriggerClick>
            <Tooltip.Trigger
              onclick={() =>
                handlePageChange(Math.min(totalPages || 1, page + 1))}
              disabled={isRefetching || page === totalPages}
              class="h-10 rounded-sm bg-background-l3 px-3 text-foreground-l2 hover:bg-background-l4 hover:text-foreground-l1 disabled:pointer-events-none disabled:opacity-50"
            >
              <IconChevronRight class="size-5" />
            </Tooltip.Trigger>
            <Tooltip.Content>Next page</Tooltip.Content>
          </Tooltip.Root>
          <Tooltip.Root disableCloseOnTriggerClick>
            <Tooltip.Trigger
              onclick={() => handlePageChange(totalPages || 1)}
              disabled={isRefetching || page === totalPages}
              class="h-10 rounded-l-sm bg-background-l3 px-3 text-foreground-l2 hover:bg-background-l4 hover:text-foreground-l1 disabled:pointer-events-none disabled:opacity-50"
            >
              <IconChevronRightPipe class="size-5" />
            </Tooltip.Trigger>
            <Tooltip.Content>Last page</Tooltip.Content>
          </Tooltip.Root>
        </div>
      </div>
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
          {@const isCurrentUser = !!(
            currentUser && solve.userId === currentUser.id
          )}
          {@const variant = getRankVariant(solve.rank, isCurrentUser)}
          <RankRow
            {variant}
            rankLabel={solve.rank}
            name={solve.userName}
            userId={solve.userId}
            subtitle="Open Division"
            primaryValue={solve.rank === 1
              ? formatFirstBloodTime(solve.createdAt, ctfStartTime)
              : formatRelativeToFirstBlood(solve.createdAt, firstBloodTime)}
            secondaryValue={formatLocalTime(solve.createdAt)}
          />
        {/each}
      </div>
    {/if}
  </ScrollArea>
</div>

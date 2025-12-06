<script lang="ts">
  import { createInfiniteQuery } from '@tanstack/svelte-query'
  import { toast } from '$lib'
  import { apiRequest, type Challenge } from '$lib/api'
  import { Button, RankRow, ScrollArea, Spinner } from '$lib/components'
  import { useClientConfig, useCurrentUser } from '$lib/query'
  import {
    formatFirstBloodTime,
    formatLocalTime,
    formatRelativeToFirstBlood,
    getRankVariant,
  } from '$lib/utils'
  import { GetChallengeSolvesRouteV2, GoodChallengeSolvesV2 } from '@rctf/types'

  const PAGE_SIZE = 10

  interface Props {
    challenge: Challenge
    userVisibleInList?: boolean
  }

  let { challenge, userVisibleInList = $bindable(false) }: Props = $props()

  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()

  const currentUser = $derived($userQuery.data)
  const clientConfig = $derived($clientConfigQuery.data)
  const ctfStartTime = $derived(clientConfig?.startTime ?? 0)
  const totalCount = $derived(challenge.solves ?? 0)

  const solvesQuery = $derived(
    createInfiniteQuery({
      queryKey: ['challenges', challenge.id, 'solves', 'infinite'] as const,
      queryFn: async ({ pageParam = 0 }) => {
        const response = await apiRequest(GetChallengeSolvesRouteV2, {
          id: challenge.id,
          limit: PAGE_SIZE,
          offset: pageParam,
        })
        if (response.kind === GoodChallengeSolvesV2.kind) {
          return { solves: response.data.solves, offset: pageParam }
        }
        throw new Error(response.message)
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage) => {
        const nextOffset = lastPage.offset + lastPage.solves.length
        return nextOffset < totalCount ? nextOffset : undefined
      },
    })
  )

  const allSolves = $derived($solvesQuery.data?.pages.flatMap(page => page.solves) ?? [])
  const firstBloodTime = $derived(allSolves[0]?.createdAt ?? 0)

  $effect(() => {
    userVisibleInList = currentUser ? allSolves.some(s => s.userId === currentUser.id) : false
  })

  $effect(() => {
    if ($solvesQuery.isError) {
      toast.error($solvesQuery.error?.message ?? 'Failed to load solves')
    }
  })
</script>

<div class="flex h-full flex-col">
  <ScrollArea class="min-h-0 flex-1" fadeSize={64} fadeColor="background-l2">
    {#if $solvesQuery.isPending}
      <div class="flex items-center justify-center py-8">
        <Spinner class="size-6" />
      </div>
    {:else if totalCount === 0}
      <p class="text-foreground-l3 py-8 text-center">No solves yet</p>
    {:else}
      <div class="flex flex-col gap-2 px-5 pt-2">
        {#each allSolves as solve, index (solve.id)}
          {@const solvePosition = index + 1}
          {@const isCurrentUser = !!(currentUser && solve.userId === currentUser.id)}
          {@const variant = getRankVariant(solvePosition, isCurrentUser)}
          <RankRow
            {variant}
            rankLabel={solvePosition}
            name={solve.userName}
            userId={solve.userId}
            division={solve.division}
            divisionPlace={solve.divisionPlace}
            primaryValue={solvePosition === 1
              ? formatFirstBloodTime(solve.createdAt, ctfStartTime)
              : formatRelativeToFirstBlood(solve.createdAt, firstBloodTime)}
            secondaryValue={formatLocalTime(solve.createdAt)} />
        {/each}
      </div>

      {#if $solvesQuery.hasNextPage}
        <div class="flex justify-center px-5 py-4">
          <Button
            class="w-full"
            disabled={$solvesQuery.isFetchingNextPage}
            onclick={() => $solvesQuery.fetchNextPage()}>
            {#if $solvesQuery.isFetchingNextPage}
              <Spinner class="mr-2 size-4" />
              Loading...
            {:else}
              Load more
            {/if}
          </Button>
        </div>
      {/if}
    {/if}
  </ScrollArea>
</div>

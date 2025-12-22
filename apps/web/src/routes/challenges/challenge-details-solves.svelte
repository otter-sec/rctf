<script lang="ts">
  import { GetChallengeSolvesRouteV2, GoodChallengeSolvesV2 } from '@rctf/types'
  import type { Challenge } from '@rctf/types'
  import { createInfiniteQuery } from '@tanstack/svelte-query'
  import { toast } from '$lib'
  import { apiRequest } from '$lib/api'
  import { EmptyState, ScrollArea, Spinner } from '$lib/components'
  import { IconTrophyFilled } from '$lib/icons'
  import { useClientConfig, useCurrentUser } from '$lib/query'
  import {
    createInfiniteVirtualizer,
    formatFirstBloodTime,
    formatLocalTime,
    formatRelativeToFirstBlood,
    getRankVariant,
    setupInfiniteScroll,
  } from '$lib/utils'
  import ChallengeDetailsSolvesRow from './challenge-details-solves-row.svelte'

  const PAGE_SIZE = 10
  const ROW_HEIGHT = 72 // 64px row + 8px gap

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
  const showDivision = $derived(
    clientConfig ? Object.keys(clientConfig.divisions).length > 1 : true
  )

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
      getNextPageParam: lastPage => {
        const nextOffset = lastPage.offset + lastPage.solves.length
        return nextOffset < totalCount ? nextOffset : undefined
      },
    })
  )

  const allSolves = $derived($solvesQuery.data?.pages.flatMap(page => page.solves) ?? [])
  const firstBloodTime = $derived(allSolves[0]?.createdAt ?? 0)

  let viewportRef = $state<HTMLElement | null>(null)
  const { virtualizer, update: updateVirtualizer } = createInfiniteVirtualizer({
    rowHeight: ROW_HEIGHT,
    overscan: 10,
  })

  $effect(() => {
    updateVirtualizer({
      count: $solvesQuery.hasNextPage ? allSolves.length + 1 : allSolves.length,
      scrollElement: viewportRef,
    })
  })

  const infiniteScroll = setupInfiniteScroll({
    getViewport: () => viewportRef,
    hasNextPage: () => $solvesQuery.hasNextPage ?? false,
    isFetching: () => $solvesQuery.isFetchingNextPage,
    onLoadMore: () => $solvesQuery.fetchNextPage(),
  })

  $effect(() => {
    if (!$solvesQuery.isFetchingNextPage) {
      infiniteScroll.resetTrigger()
    }
  })

  $effect(() => {
    const v = viewportRef
    if (!v) return
    return infiniteScroll.attach(v)
  })

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
  <ScrollArea bind:viewportRef class="min-h-0 flex-1" fadeSize={64} fadeColor="background-l2">
    {#if $solvesQuery.isPending}
      <div class="flex items-center justify-center py-8">
        <Spinner class="size-6" />
      </div>
    {:else if totalCount === 0}
      <EmptyState
        icon={IconTrophyFilled}
        title="No solves yet"
        subtitle="Be the first to solve this challenge!"
        class="h-full"
      />
    {:else}
      <div
        class="virtual-list-container perf-contain-layout perf-backface-hidden relative px-5 pt-2"
        style="height: {$virtualizer.getTotalSize()}px;"
      >
        {#each $virtualizer.getVirtualItems() as row (row.index)}
          {#if row.index > allSolves.length - 1}
            <div
              class="absolute top-0 left-0 flex w-full items-center justify-center"
              style="height: {row.size}px; transform: translate3d(0, {row.start}px, 0);"
            >
              {#if $solvesQuery.hasNextPage}
                <Spinner class="text-foreground-l3 size-5" />
              {/if}
            </div>
          {:else if allSolves[row.index]}
            {@const solve = allSolves[row.index]!}
            {@const solvePosition = row.index + 1}
            {@const isCurrentUser = !!(currentUser && solve.userId === currentUser.id)}
            {@const variant = getRankVariant(solvePosition, isCurrentUser)}
            <div
              class="perf-contain-paint perf-will-transform absolute top-0 left-0 w-full"
              style="height: {row.size}px; transform: translate3d(0, {row.start}px, 0);"
            >
              <ChallengeDetailsSolvesRow
                {variant}
                rankLabel={solvePosition}
                name={solve.userName}
                userId={solve.userId}
                avatarUrl={solve.userAvatarUrl}
                countryCode={solve.userCountryCode}
                globalPlace={solve.globalPlace}
                divisionId={showDivision ? solve.division : undefined}
                divisionPlace={showDivision ? solve.divisionPlace : undefined}
                primaryValue={solvePosition === 1
                  ? formatFirstBloodTime(solve.createdAt, ctfStartTime)
                  : formatRelativeToFirstBlood(solve.createdAt, firstBloodTime)}
                secondaryValue={formatLocalTime(solve.createdAt)}
              />
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </ScrollArea>
</div>

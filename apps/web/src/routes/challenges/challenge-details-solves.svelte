<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { toast } from '$lib'
  import { EmptyState, ScrollArea, Spinner, VirtualList } from '$lib/components'
  import { IconTrophyFilled } from '$lib/icons'
  import { useClientConfig, useCurrentUser, useInfiniteChallengeSolves } from '$lib/query'
  import {
    formatFirstBloodTime,
    formatLocalTime,
    formatRelativeToFirstBlood,
    getRankVariant,
    useInfiniteVirtualScroll,
  } from '$lib/utils'
  import ChallengeDetailsSolvesRow from './challenge-details-solves-row.svelte'

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

  const solvesQuery = $derived(useInfiniteChallengeSolves(challenge.id, totalCount))

  const allSolves = $derived($solvesQuery.data?.pages.flatMap(page => page.solves) ?? [])
  const firstBloodTime = $derived(allSolves[0]?.createdAt ?? 0)

  const scroll = useInfiniteVirtualScroll({
    rowHeight: ROW_HEIGHT,
    overscan: 10,
    onLoadMore: () => $solvesQuery.fetchNextPage(),
  })

  $effect(() => {
    scroll.state.count = $solvesQuery.hasNextPage ? allSolves.length + 1 : allSolves.length
    scroll.state.hasNextPage = $solvesQuery.hasNextPage ?? false
    scroll.state.isFetching = $solvesQuery.isFetchingNextPage
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
  <ScrollArea
    bind:viewportRef={scroll.state.viewportRef}
    class="min-h-0 flex-1"
    fadeSize={64}
    fadeColor="background-l2"
  >
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
      <VirtualList
        virtualItems={scroll.virtualItems}
        totalSize={scroll.totalSize}
        items={allSolves}
        hasNextPage={$solvesQuery.hasNextPage}
        class="px-5 pt-2"
      >
        {#snippet children({ item, index })}
          {@const solve = item}
          {@const solvePosition = index + 1}
          {@const isCurrentUser = !!(currentUser && solve.userId === currentUser.id)}
          {@const variant = getRankVariant(solvePosition, isCurrentUser)}
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
        {/snippet}
      </VirtualList>
    {/if}
  </ScrollArea>
</div>

<script lang="ts">
  import type { Challenge } from '@rctf/types'
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
  import { toast } from 'svelte-sonner'
  import ChallengeDetailsSolvesRow from './challenges-details-row.svelte'
  import ChallengeDetailsSolvesSelf from './challenges-details-solves-self.svelte'

  const ROW_HEIGHT = 68

  interface Props {
    challenge: Challenge
  }

  let { challenge }: Props = $props()

  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()

  const currentUser = $derived(userQuery.data)
  const currentUserSolve = $derived(currentUser?.solves.find(s => s.id === challenge.id))
  const clientConfig = $derived(clientConfigQuery.data)
  const ctfStartTime = $derived(clientConfig?.startTime ?? 0)
  const totalCount = $derived(challenge.solves ?? 0)
  const showDivision = $derived(
    clientConfig ? Object.keys(clientConfig.divisions).length > 1 : true
  )

  const solvesQuery = useInfiniteChallengeSolves(
    () => challenge.id,
    () => totalCount
  )

  const allSolves = $derived(solvesQuery.data?.pages.flatMap(page => page.solves) ?? [])
  const firstBloodTime = $derived(allSolves[0]?.createdAt ?? 0)

  const userSolveIndex = $derived(
    currentUser ? allSolves.findIndex(s => s.userId === currentUser.id) : -1
  )

  const scroll = useInfiniteVirtualScroll({
    rowHeight: ROW_HEIGHT,
    overscan: 10,
    onLoadMore: () => solvesQuery.fetchNextPage(),
  })

  $effect(() => {
    scroll.state.count = solvesQuery.hasNextPage ? allSolves.length + 1 : allSolves.length
    scroll.state.hasNextPage = solvesQuery.hasNextPage ?? false
    scroll.state.isFetching = solvesQuery.isFetchingNextPage
  })

  let viewportWindow = $state<{ scrollTop: number; clientHeight: number } | null>(null)
  $effect(() => {
    void scroll.virtualItems
    const viewport = scroll.state.viewportRef
    viewportWindow = viewport
      ? { scrollTop: viewport.scrollTop, clientHeight: viewport.clientHeight }
      : null
  })

  const selfRowPosition = $derived.by((): 'top' | 'bottom' | null => {
    const metrics = viewportWindow
    if (!currentUser || !currentUserSolve || !metrics) return null
    if (userSolveIndex === -1) return 'bottom'
    const viewportTop = metrics.scrollTop
    const viewportBottom = metrics.scrollTop + metrics.clientHeight
    const itemTop = userSolveIndex * ROW_HEIGHT
    const itemBottom = itemTop + ROW_HEIGHT
    if (itemTop >= viewportTop && itemBottom <= viewportBottom) return null
    if (itemTop < viewportTop) return 'top'
    return 'bottom'
  })

  const PINNED_ROW_HEIGHT_PX = 64
  const fadeOffsets = $derived(
    selfRowPosition === 'top'
      ? { top: PINNED_ROW_HEIGHT_PX }
      : selfRowPosition === 'bottom'
        ? { bottom: PINNED_ROW_HEIGHT_PX }
        : {}
  )

  $effect(() => {
    if (solvesQuery.isError) {
      toast.error(solvesQuery.error?.message ?? 'Failed to load solves')
    }
  })
</script>

<div class="flex h-full flex-col">
  <div class="relative mt-4 min-h-0 flex-1">
    <ScrollArea
      bind:viewportRef={scroll.state.viewportRef}
      class="h-full"
      fadeSize={64}
      fadeColor="background-l2"
      {fadeOffsets}
      viewportTabIndex={-1}
    >
      {#if solvesQuery.isPending}
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
          hasNextPage={solvesQuery.hasNextPage}
          class="mx-5"
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
              {isCurrentUser}
              primaryValue={solvePosition === 1
                ? formatFirstBloodTime(solve.createdAt, ctfStartTime)
                : formatRelativeToFirstBlood(solve.createdAt, firstBloodTime)}
              secondaryValue={formatLocalTime(solve.createdAt)}
            />
          {/snippet}
        </VirtualList>
      {/if}
    </ScrollArea>
    {#if selfRowPosition === 'top'}
      <div
        class="bg-background-l2 pointer-events-none absolute inset-x-0 top-0 z-20 px-5 [&_a]:pointer-events-auto"
      >
        <ChallengeDetailsSolvesSelf {challenge} />
      </div>
    {:else if selfRowPosition === 'bottom'}
      <div
        class="bg-background-l2 pointer-events-none absolute inset-x-0 bottom-0 z-20 px-5 [&_a]:pointer-events-auto"
      >
        <ChallengeDetailsSolvesSelf {challenge} />
      </div>
    {/if}
  </div>
</div>

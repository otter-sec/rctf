<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { EmptyState, ScrollArea, Spinner, VirtualList } from '$lib/components'
  import { IconChartAreaLineFilled } from '$lib/icons'
  import {
    useChallengeScores,
    useClientConfig,
    useCurrentUser,
    useInfiniteChallengeScores,
  } from '$lib/query'
  import { getRankColorForPosition, getRankVariant, useInfiniteVirtualScroll } from '$lib/utils'
  import { toast } from 'svelte-sonner'
  import ChallengeDetailsScoresSelf from './challenge-details-scores-self.svelte'
  import ChallengeDetailsSolvesRow from './challenge-details-solves-row.svelte'
  import ChallengeDynamicDelta from './challenge-dynamic-delta.svelte'
  import ChallengeDynamicGraphControls from './challenge-dynamic-graph-controls.svelte'
  import ChallengeDynamicGraph from './challenge-dynamic-graph.svelte'

  const ROW_HEIGHT = 68

  interface Props {
    challenge: Challenge
  }

  let { challenge }: Props = $props()

  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()

  const currentUser = $derived(userQuery.data)
  const clientConfig = $derived(clientConfigQuery.data)
  const showDivision = $derived(
    clientConfig ? Object.keys(clientConfig.divisions).length > 1 : true
  )

  const scoresQuery = useInfiniteChallengeScores(() => challenge.id)

  const allScores = $derived(scoresQuery.data?.pages.flatMap(page => page.scores) ?? [])
  const allGraphData = $derived(scoresQuery.data?.pages.flatMap(page => page.graph) ?? [])
  const total = $derived(scoresQuery.data?.pages[0]?.total ?? challenge.solves ?? 0)

  const userScoreIndex = $derived(
    currentUser ? allScores.findIndex(s => s.userId === currentUser.id) : -1
  )

  const scroll = useInfiniteVirtualScroll({
    rowHeight: ROW_HEIGHT,
    overscan: 10,
    onLoadMore: () => scoresQuery.fetchNextPage(),
  })

  // Live viewport scroll position + height. The virtual-scroll hook only emits
  // metrics on actual scroll events (not on resize/measure), so we read the
  // viewport whenever the virtualizer recomputes. Without this the graph window
  // stays empty after switching to the Scores tab until you scroll once.
  let viewportWindow = $state<{ scrollTop: number; clientHeight: number } | null>(null)
  $effect(() => {
    void scroll.virtualItems
    const viewport = scroll.state.viewportRef
    viewportWindow = viewport
      ? { scrollTop: viewport.scrollTop, clientHeight: viewport.clientHeight }
      : null
  })

  const myPosition = $derived(scoresQuery.data?.pages[0]?.myPosition ?? null)

  // graph pin toggles (mirrors the /scores graph controls)
  let showTop3Context = $state(true)
  let showSelfContext = $state(true)

  // Stable line color per team keyed by global rank, so a team keeps its color
  // as it scrolls in and out of the drawn set.
  const teamColors = $derived.by(() => {
    const colors: Record<string, string> = {}
    allScores.forEach((score, i) => {
      colors[score.userId] = getRankColorForPosition(
        i + 1,
        currentUser?.id === score.userId,
        score.userId
      )
    })
    return colors
  })

  // Self's own history, fetched on demand so "pin self" works even when the
  // user's row hasn't been paged in yet (mirrors /scores' useSelfUserGraph).
  const selfNeedsFetch = $derived(
    showSelfContext && !!currentUser && !!myPosition && userScoreIndex === -1
  )
  const selfGraphQuery = useChallengeScores(
    () => challenge.id,
    () => ({ limit: 1, offset: selfNeedsFetch ? (myPosition ?? 1) - 1 : 0 })
  )
  const selfGraphEntry = $derived(
    selfNeedsFetch ? (selfGraphQuery.data?.graph.find(g => g.id === currentUser?.id) ?? null) : null
  )

  // Mirror /scores (addViewportTeams + getGraphVisibility): draw the rows
  // intersecting the viewport, optionally pin the top 3 (dimmed as context once
  // scrolled past) and self. virtualItems include overscan rows rendered just
  // outside the viewport, so intersect against the live scroll metrics rather
  // than drawing every rendered row (that's what put 16 lines on screen when
  // only ~5 rows were visible).
  const GRAPH_CONTEXT_COUNT = 3
  const GRAPH_FALLBACK_COUNT = 10
  const graphVisibility = $derived.by(() => {
    const visible: Record<string, true> = {}
    const context: Record<string, true> = {}
    const addVisible = (index: number) => {
      const score = allScores[index]
      if (score) visible[score.userId] = true
    }

    const metrics = viewportWindow
    if (!metrics) {
      // before the viewport is measured, fall back to the top teams
      for (let i = 0; i < Math.min(GRAPH_FALLBACK_COUNT, allScores.length); i++) {
        addVisible(i)
      }
    } else {
      let minIndex = Infinity
      let maxIndex = -1
      const viewportTop = metrics.scrollTop
      const viewportBottom = metrics.scrollTop + metrics.clientHeight
      for (const item of scroll.virtualItems) {
        const itemTop = item.start
        const itemBottom = item.start + item.size
        if (itemBottom > viewportTop && itemTop < viewportBottom) {
          if (item.index < minIndex) minIndex = item.index
          if (item.index > maxIndex) maxIndex = item.index
        }
      }

      // pinned top 3 — dimmed as context once they scroll out of the window
      if (showTop3Context) {
        for (let i = 0; i < Math.min(GRAPH_CONTEXT_COUNT, allScores.length); i++) {
          const score = allScores[i]
          if (!score) continue
          visible[score.userId] = true
          if (i < minIndex || i > maxIndex) context[score.userId] = true
        }
      }

      for (let i = minIndex; i <= maxIndex; i++) addVisible(i)
    }

    // pinned self — drawn at full opacity (the graph treats it as the self line)
    if (showSelfContext && currentUser && myPosition) {
      visible[currentUser.id] = true
    }

    return { visible, context }
  })

  // Freeze the drawn set while actively scrolling so the chart doesn't rebuild
  // every frame; it snaps to the new window once scrolling settles.
  let stableVisibility = $state<{
    visible: Record<string, true>
    context: Record<string, true>
  }>({ visible: {}, context: {} })
  $effect(() => {
    // read graphVisibility unconditionally so it stays tracked even while
    // scrolling; only the assignment is frozen during an active scroll gesture
    const next = graphVisibility
    if (!scroll.isScrolling) {
      stableVisibility = next
    }
  })

  const visibleGraphData = $derived.by(() => {
    const entries = allGraphData.filter(team => stableVisibility.visible[team.id])
    // self may not be in the loaded pages; append its fetched line when pinned
    if (
      selfGraphEntry &&
      currentUser &&
      stableVisibility.visible[currentUser.id] &&
      !entries.some(team => team.id === currentUser.id)
    ) {
      entries.push(selfGraphEntry)
    }
    return entries
  })
  const contextTeamIds = $derived(stableVisibility.context)

  $effect(() => {
    scroll.state.count = scoresQuery.hasNextPage ? allScores.length + 1 : allScores.length
    scroll.state.hasNextPage = scoresQuery.hasNextPage ?? false
    scroll.state.isFetching = scoresQuery.isFetchingNextPage
  })

  // pin the self row to the top when the user's row is above the viewport, to
  // the bottom when it's below, and hide it when it's fully in view (mirrors
  // /scores). derived from the captured viewportWindow, so it's a pure
  // derivation rather than an effect.
  const selfRowPosition = $derived.by((): 'top' | 'bottom' | null => {
    const metrics = viewportWindow
    if (!currentUser || !myPosition || !metrics) return null
    // scored, but the row hasn't been paged in yet — it's below the loaded range
    if (userScoreIndex === -1) return 'bottom'
    const viewportTop = metrics.scrollTop
    const viewportBottom = metrics.scrollTop + metrics.clientHeight
    const itemTop = userScoreIndex * ROW_HEIGHT
    const itemBottom = itemTop + ROW_HEIGHT
    // fully in view → no pin; top edge above → pin top; otherwise pin bottom
    if (itemTop >= viewportTop && itemBottom <= viewportBottom) return null
    if (itemTop < viewportTop) return 'top'
    return 'bottom'
  })

  // start the scroll fade flush with the pinned self row's edge (its own height,
  // h-16 = 64px — not the 68px virtual slot) so the bg blends seamlessly into
  // the fade instead of leaving a sliver of the next row showing
  const PINNED_ROW_HEIGHT_PX = 64
  const fadeOffsets = $derived(
    selfRowPosition === 'top'
      ? { top: PINNED_ROW_HEIGHT_PX }
      : selfRowPosition === 'bottom'
        ? { bottom: PINNED_ROW_HEIGHT_PX }
        : {}
  )

  $effect(() => {
    if (scoresQuery.isError) {
      toast.error(scoresQuery.error?.message ?? 'Failed to load scores')
    }
  })
</script>

<div class="flex h-full flex-col">
  {#if scoresQuery.isPending}
    <div class="flex items-center justify-center py-8">
      <Spinner class="size-6" />
    </div>
  {:else if total === 0}
    <EmptyState
      icon={IconChartAreaLineFilled}
      title="No scores yet"
      subtitle="Scores appear here once the scoring feed publishes them."
      class="h-full"
    />
  {:else}
    <div class="shrink-0 px-5 pt-4">
      <div class="group/graph relative h-44 w-full">
        <ChallengeDynamicGraph graphData={visibleGraphData} {teamColors} {contextTeamIds} />
        <div
          class="absolute top-0 left-0 z-10 opacity-0 transition-opacity duration-150 group-hover/graph:opacity-100 focus-within:opacity-100"
        >
          <ChallengeDynamicGraphControls bind:showTop3Context bind:showSelfContext />
        </div>
      </div>
    </div>
    <div class="relative mt-3 mb-4 min-h-0 flex-1">
      <ScrollArea
        bind:viewportRef={scroll.state.viewportRef}
        class="h-full"
        fadeSize={64}
        fadeColor="background-l2"
        {fadeOffsets}
        viewportTabIndex={-1}
      >
        <VirtualList
          virtualItems={scroll.virtualItems}
          totalSize={scroll.totalSize}
          items={allScores}
          hasNextPage={scoresQuery.hasNextPage}
          class="mx-5 mb-2"
        >
          {#snippet children({ item, index })}
            {@const score = item}
            {@const position = index + 1}
            {@const isCurrentUser = !!(currentUser && score.userId === currentUser.id)}
            {@const variant = getRankVariant(position, isCurrentUser)}
            <ChallengeDetailsSolvesRow
              {variant}
              rankLabel={position}
              name={score.userName}
              userId={score.userId}
              avatarUrl={score.userAvatarUrl}
              countryCode={score.userCountryCode}
              globalPlace={score.globalPlace}
              divisionId={showDivision ? score.division : undefined}
              divisionPlace={showDivision ? score.divisionPlace : undefined}
              {isCurrentUser}
            >
              <span class="text-foreground-l1 text-lg whitespace-nowrap tabular-nums sm:text-xl">
                {score.points.toLocaleString()} pts
              </span>
              <ChallengeDynamicDelta
                delta={score.pointDelta}
                class="justify-end text-sm sm:text-base"
              />
            </ChallengeDetailsSolvesRow>
          {/snippet}
        </VirtualList>
      </ScrollArea>
      {#if selfRowPosition === 'top'}
        <div
          class="bg-background-l2 pointer-events-none absolute inset-x-0 top-0 z-20 px-5 [&_a]:pointer-events-auto"
        >
          <ChallengeDetailsScoresSelf {challenge} />
        </div>
      {:else if selfRowPosition === 'bottom'}
        <div
          class="bg-background-l2 pointer-events-none absolute inset-x-0 bottom-0 z-20 px-5 [&_a]:pointer-events-auto"
        >
          <ChallengeDetailsScoresSelf {challenge} />
        </div>
      {/if}
    </div>
  {/if}
</div>

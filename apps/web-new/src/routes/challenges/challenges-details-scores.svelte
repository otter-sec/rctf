<!--
  Scores tab — dynamic (KotH) challenges. A cumulative-score graph sits above a
  plain paged ranked list (KTD-3), no virtualizer: every loaded row is in the DOM
  but marked `content-visibility: auto`, so off-screen rows skip paint and layout.
  An IntersectionObserver sentinel drives load-more; a second observer tracks the
  user's own row so a pinned copy can be shown whenever it scrolls out of view (or
  lives on a page that has not loaded yet). Each row carries a rank-movement
  chevron plus 'N pts' and the point-delta chip on the trailing edge.
-->
<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { captureElement } from '$lib/attachments/capture-element'
  import EdgeFades from '$lib/components/edge-fades.svelte'
  import {
    createScrollGeometry,
    deriveEdgeFades,
    deriveSelfRowClip,
  } from '$lib/components/scroll-geometry.svelte'
  import IconChartAreaLineFilled from '$lib/icons/icon-chart-area-line-filled.svelte'
  import { useChallengeScores, useChallengeScoresInfinite } from '$lib/query/challenges'
  import { useClientConfig } from '$lib/query/config'
  import { useCurrentUser } from '$lib/query/user'
  import { toast } from '$lib/toast'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import type { Attachment } from 'svelte/attachments'
  import { getRankTier, getSparklineDataByTeam } from '../scores/scores-transforms'
  import ChallengeDetailsRow from './challenges-details-row.svelte'
  import ScoreTrailing from './challenges-details-score-trailing.svelte'
  import ChallengeDetailsScoresGraph from './challenges-details-scores-graph.svelte'
  import ChallengeDetailsScoresSelf from './challenges-details-scores-self.svelte'
  import ChallengePointDelta from './challenges-point-delta.svelte'
  import { computeRankDeltas } from './rank-delta'
  import { rankVariant } from './solve-times'

  interface Props {
    challenge: Challenge
  }

  let { challenge }: Props = $props()

  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()
  const scoresQuery = useChallengeScoresInfinite(() => challenge.id)
  // A limit-1 read carries the caller's own rank so a solver on an unloaded page
  // can still be pinned, without pulling their whole page.
  const selfQuery = useChallengeScores(
    () => challenge.id,
    () => ({ limit: 1, offset: 0 })
  )

  // Non-reactive read: true only when this mount actually starts behind the
  // spinner, so a warm-cache remount doesn't replay the reveal fade.
  const revealAfterLoading = scoresQuery.isPending

  const currentUser = $derived(userQuery.data)
  const clientConfig = $derived(clientConfigQuery.data)
  const startTime = $derived(clientConfig?.startTime ?? 0)
  const endTime = $derived(clientConfig?.endTime ?? 0)
  const showDivision = $derived(
    clientConfig ? Object.keys(clientConfig.divisions).length > 1 : true
  )

  const allScores = $derived(scoresQuery.data?.pages.flatMap(page => page.scores) ?? [])
  const total = $derived(scoresQuery.data?.pages[0]?.total ?? 0)

  // The graph series are duplicated across pages; keep the first sighting of
  // each team id so the graph draws every team once. Points arrive newest-first
  // and are sorted ascending once here, for the graph and sparklines alike.
  type GraphSeries = NonNullable<typeof scoresQuery.data>['pages'][number]['graph'][number]
  const graph = $derived.by(() => {
    const seen = new Set<string>()
    const series: GraphSeries[] = []
    for (const page of scoresQuery.data?.pages ?? []) {
      for (const entry of page.graph) {
        if (!seen.has(entry.id)) {
          seen.add(entry.id)
          series.push({ ...entry, points: [...entry.points].sort((a, b) => a.time - b.time) })
        }
      }
    }
    return series
  })

  const rankDeltas = $derived(computeRankDeltas(allScores))

  // Same 12h trailing window as the /scores leaderboard sparklines.
  const sparklineByTeam = $derived(getSparklineDataByTeam(graph, null))

  const myPosition = $derived(selfQuery.data?.myPosition ?? null)
  const userScoreIndex = $derived(
    currentUser ? allScores.findIndex(score => score.userId === currentUser.id) : -1
  )
  const selfRankDelta = $derived(currentUser ? rankDeltas.get(currentUser.id) : undefined)

  // The scroll container, captured by an attachment so scroll geometry and the
  // load-more observer below can use it.
  let scrollRoot = $state<HTMLElement | null>(null)
  const captureScroll = captureElement<HTMLElement>(node => (scrollRoot = node))

  const geometry = createScrollGeometry(() => scrollRoot)
  const fades = deriveEdgeFades(geometry)

  // The current user's real row, captured so the shared clip can read its
  // layout position.
  let selfRowNode = $state<HTMLElement | null>(null)
  const captureSelfRow = captureElement<HTMLElement>(node => (selfRowNode = node))
  const selfClip = deriveSelfRowClip(geometry, () => selfRowNode)

  // Which edge to pin the self overlay to, decided by the self-position query —
  // not geometry alone, so a scorer on an unloaded page still gets pinned.
  const pinnedEdge = $derived.by((): 'top' | 'bottom' | null => {
    if (myPosition === null || !currentUser) return null
    if (userScoreIndex === -1) return 'bottom'
    return selfClip.edge
  })

  // The list and overlay elements, captured so the live graph window below can
  // measure real row geometry (the row gap is a fluid token, so the stride is
  // measured rather than assumed) and exclude rows hidden behind the pin.
  let listNode = $state<HTMLElement | null>(null)
  const captureList = captureElement<HTMLElement>(node => (listNode = node))
  let overlayNode = $state<HTMLElement | null>(null)
  const captureOverlay = captureElement<HTMLElement>(node => (overlayNode = node))

  // Row stride and first-row midpoint are layout facts: they change on resize
  // (the row gap is a fluid token) or content growth (page loads), never on
  // scroll alone — so the offset reads key off those signals and stay out of
  // the per-scroll path below.
  const rowMetrics = $derived.by(() => {
    if (geometry.clientWidth === 0 || geometry.scrollHeight === 0) return null
    const row0 = listNode?.firstElementChild as HTMLElement | null | undefined
    if (!row0) return null
    const row1 = row0.nextElementSibling as HTMLElement | null
    const stride = row1 ? row1.offsetTop - row0.offsetTop : row0.offsetHeight
    if (stride <= 0) return null
    return { mid0: row0.offsetTop + row0.offsetHeight / 2, stride }
  })

  // Live scroll window over the ranked rows, like /scores: a row counts as
  // visible while its midpoint is inside the viewport band (minus the pinned
  // overlay's edge). Identity-memoed so per-scroll-frame recomputes only
  // propagate to the graph when the window actually changes.
  let lastWindow = { first: -1, last: -1 }
  const liveWindow = $derived.by(() => {
    let first = -1
    let last = -1
    const loaded = allScores.length
    if (rowMetrics && loaded > 0 && geometry.clientHeight > 0) {
      const overlayHeight = pinnedEdge ? (overlayNode?.offsetHeight ?? 0) : 0
      const bandTop = geometry.scrollTop + (pinnedEdge === 'top' ? overlayHeight : 0)
      const bandBottom =
        geometry.scrollTop + geometry.clientHeight - (pinnedEdge === 'bottom' ? overlayHeight : 0)
      first = Math.max(0, Math.ceil((bandTop - rowMetrics.mid0) / rowMetrics.stride))
      last = Math.min(loaded - 1, Math.ceil((bandBottom - rowMetrics.mid0) / rowMetrics.stride) - 1)
      if (last < first) {
        first = -1
        last = -1
      }
    }
    if (lastWindow.first !== first || lastWindow.last !== last) {
      lastWindow = { first, last }
    }
    return lastWindow
  })

  const visibleTeamIds = $derived.by(() => {
    const ids = new Set<string>()
    if (liveWindow.first >= 0) {
      for (let index = liveWindow.first; index <= liveWindow.last; index++) {
        const score = allScores[index]
        if (score) ids.add(score.userId)
      }
    }
    return ids
  })

  // Fetch the next page as the sentinel nears the viewport.
  const loadMore: Attachment<HTMLElement> = node => {
    const root = scrollRoot
    if (!root) return
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting && scoresQuery.hasNextPage && !scoresQuery.isFetchingNextPage) {
            scoresQuery.fetchNextPage()
          }
        }
      },
      { root, rootMargin: '200px 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }

  $effect(() => {
    if (scoresQuery.isError) {
      toast.error(scoresQuery.error?.message ?? 'Failed to load scores')
    }
  })
</script>

<scores>
  {#if scoresQuery.isPending}
    <scores-status><Spinner label="Loading scores" /></scores-status>
  {:else if total === 0}
    <EmptyState
      icon={IconChartAreaLineFilled}
      title="No scores yet"
      subtitle="Scores appear here once the scoring feed publishes them."
    />
  {:else}
    <scores-graph data-reveal={revealAfterLoading || undefined}>
      <ChallengeDetailsScoresGraph
        {graph}
        {visibleTeamIds}
        selfId={currentUser?.id ?? null}
        {startTime}
        {endTime}
      />
    </scores-graph>

    <scores-viewport data-reveal={revealAfterLoading || undefined}>
      <scores-scroll {@attach captureScroll} tabindex="-1">
        <scores-list {@attach captureList}>
          {#each allScores as score, index (score.userId)}
            {@const rank = index + 1}
            {@const isSelf = !!(currentUser && score.userId === currentUser.id)}
            <row-slot {@attach isSelf && captureSelfRow}>
              <ChallengeDetailsRow
                variant={rankVariant(rank, isSelf)}
                {rank}
                name={score.userName}
                userId={score.userId}
                avatarUrl={score.userAvatarUrl}
                countryCode={score.userCountryCode}
                globalPlace={score.globalPlace}
                division={showDivision ? score.division : null}
                divisionPlace={showDivision ? score.divisionPlace : null}
                {isSelf}
              >
                {#snippet rankAccessory()}
                  <ChallengePointDelta delta={rankDeltas.get(score.userId)} variant="rank" />
                {/snippet}
                <ScoreTrailing
                  points={score.points}
                  delta={score.pointDelta}
                  role={getRankTier(isSelf, rank, score.userId)}
                  sparkline={sparklineByTeam.get(score.userId) ?? []}
                  sparklineId={score.userId}
                />
              </ChallengeDetailsRow>
            </row-slot>
          {/each}

          {#if scoresQuery.isFetchingNextPage}
            <scores-loading><Spinner label="Loading more scores" /></scores-loading>
          {/if}

          <scores-sentinel {@attach loadMore}></scores-sentinel>
        </scores-list>
      </scores-scroll>

      {#if pinnedEdge && myPosition !== null}
        <self-overlay data-edge={pinnedEdge} {@attach captureOverlay}>
          <ChallengeDetailsScoresSelf
            {challenge}
            rank={myPosition}
            rankDelta={selfRankDelta}
            {showDivision}
            sparkline={(currentUser && sparklineByTeam.get(currentUser.id)) ?? []}
          />
        </self-overlay>
      {/if}

      <EdgeFades
        top={fades.top}
        bottom={fades.bottom}
        selfEdge={(myPosition !== null && pinnedEdge) || null}
      />
    </scores-viewport>
  {/if}
</scores>

<style>
  scores {
    display: flex;
    flex-direction: column;
    block-size: 100%;
    min-block-size: 0;
  }

  scores-status {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    font-size: var(--step-1);
    color: var(--foreground-l3);
  }

  scores-graph {
    display: block;
    flex-shrink: 0;
    padding: 1rem 1.25rem 0;
  }

  scores-viewport {
    position: relative;
    flex: 1;
    min-block-size: 0;
  }

  scores-scroll {
    display: block;
    block-size: 100%;
    overflow-y: auto;
    outline: none;
  }

  scores-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    padding: 0.75rem 1.25rem 1rem;
  }

  /* The intrinsic estimate must equal the real slot height (a 4rem row; the
     4px row gap is the list's flex gap, outside the slot). An overestimate
     makes never-rendered slots taller than rendered ones, so positions shift
     as slots render/skip and scroll anchoring visibly nudges the list. */
  row-slot {
    display: block;
    content-visibility: auto;
    contain-intrinsic-size: auto 4rem;
  }

  scores-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    block-size: 4rem;
    font-size: var(--step-1);
    color: var(--foreground-l3);
  }

  scores-sentinel {
    display: block;
    block-size: 1px;
  }

  /* Pinned copy of the user's row, held over the top or bottom edge of the
     scroll viewport. Transparent to pointer events so scrolling and hovering the
     rows underneath still work, except the profile link stays clickable. */
  self-overlay {
    position: absolute;
    inset-inline: 0;
    z-index: 1;
    padding-inline: 1.25rem;
    pointer-events: none;
    background: var(--background-l2);

    /* The top pin keeps a 1rem breathing gap (matching the list's block
       padding) instead of sitting flush against the viewport edge; the gap is
       part of the overlay's opaque surface so rows scroll beneath it. */
    &[data-edge='top'] {
      inset-block-start: 0;
      padding-block-start: 1rem;
      padding-block-end: var(--space-3xs);
    }

    &[data-edge='bottom'] {
      inset-block-end: 0;
      padding-block-start: var(--space-3xs);
    }

    :global(a) {
      pointer-events: auto;
    }
  }
</style>

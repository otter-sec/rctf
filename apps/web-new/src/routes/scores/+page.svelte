<script lang="ts">
  import CtfNotStarted from '$lib/components/ctf-not-started.svelte'
  import IconFlag from '$lib/icons/icon-flag-filled.svelte'
  import IconSearch from '$lib/icons/icon-search.svelte'
  import IconTrophy from '$lib/icons/icon-trophy-filled.svelte'
  import { useClientConfig } from '$lib/query/config'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import ScoresLeaderboard from './leaderboard/leaderboard.svelte'
  import { createScoresData } from './model/data.svelte'
  import { getVisibleSolveCount } from './model/transforms'
  import { createScoresRouteState } from './model/url-state.svelte'
  import type { ScreenshotTeam } from './screenshot/options'
  import ScoresScreenshotModal from './screenshot/screenshot-modal.svelte'
  import ScoresToolbar from './toolbar/toolbar.svelte'

  const configQuery = useClientConfig()
  const ctfName = $derived(configQuery.data?.ctfName)
  const divisions = $derived(configQuery.data?.divisions ?? {})
  const startTime = $derived(configQuery.data?.startTime ?? 0)

  const urlState = createScoresRouteState()

  const data = createScoresData({
    division: () => urlState.division,
    search: () => urlState.search,
    sortMode: () => urlState.sortMode,
    focusedChallengeId: () => urlState.focusedChallengeId,
    showTop3Context: () => urlState.showTop3Context,
    showSelfContext: () => urlState.showSelfContext,
  })

  const revealAfterLoading = data.isLoading

  const endTime = $derived(configQuery.data?.endTime ?? null)

  let screenshotOpen = $state(false)

  function toScreenshotTeam(entry: (typeof data.entries)[number], index: number): ScreenshotTeam {
    return {
      id: entry.id,
      rank: entry.globalPlace ?? index + 1,
      name: entry.name,
      avatarUrl: entry.avatarUrl,
      countryCode: entry.countryCode,
      statusText: entry.statusText,
      score: entry.score,
      solveCount: getVisibleSolveCount(entry.solves, data.challengesData),
      isCurrentUser: entry.id === data.currentUserId,
      sparklineData: data.sparklineDataByTeam.get(entry.id) ?? [],
      color: data.teamColorMap.get(entry.id) ?? 'var(--foreground-l3)',
    }
  }

  const screenshotTeams = $derived(data.entries.map(toScreenshotTeam))

  const screenshotSelfTeam = $derived.by((): ScreenshotTeam | null => {
    const user = data.currentUser
    if (!user) return null
    const listed = screenshotTeams.find(team => team.id === user.id)
    if (listed) return listed
    if (user.globalPlace === null) return null
    return {
      id: user.id,
      rank: user.globalPlace,
      name: user.name,
      avatarUrl: user.avatarUrl,
      countryCode: user.countryCode,
      statusText: user.statusText,
      score: user.score,
      solveCount: getVisibleSolveCount(user.solves, data.challengesData),
      isCurrentUser: true,
      sparklineData: data.sparklineDataByTeam.get(user.id) ?? [],
      color: data.teamColorMap.get(user.id) ?? 'var(--foreground-self-l0)',
    }
  })

  const screenshotSolvesByTeam = $derived.by(() => {
    const map = new Map<string, Set<string>>()
    for (const entry of data.entries) {
      map.set(entry.id, new Set(entry.solves.map(solve => solve.id)))
    }
    const user = data.currentUser
    if (user && !map.has(user.id)) {
      map.set(user.id, new Set(user.solves.map(solve => solve.id)))
    }
    return map
  })

  const focusFetching = $derived(
    !!urlState.focusedChallengeId &&
      data.entries.length === 0 &&
      (data.hasNextPage || data.isFetchingNextPage)
  )
</script>

<svelte:head>
  {#if ctfName}
    <title>Scores | {ctfName}</title>
  {/if}
</svelte:head>

{#if data.isNotStarted}
  <CtfNotStarted />
{:else}
  <scores-page>
    <ScoresToolbar {data} {urlState} {divisions} onScreenshot={() => (screenshotOpen = true)} />

    {#if data.isLoading || focusFetching}
      <scores-leaderboard-slot>
        <Spinner />
      </scores-leaderboard-slot>
    {:else if data.loadError && data.entries.length === 0}
      <scores-leaderboard-slot>
        <EmptyState
          icon={IconTrophy}
          title="Couldn't load the scoreboard"
          subtitle={data.loadError.message}
        />
      </scores-leaderboard-slot>
    {:else if data.entries.length > 0}
      <scores-frame data-reveal={revealAfterLoading || undefined}>
        <ScoresLeaderboard {data} {urlState} {divisions} {startTime} />
      </scores-frame>
    {:else}
      <scores-leaderboard-slot>
        {#if urlState.focusedChallengeId}
          <EmptyState
            icon={IconFlag}
            title="No solves"
            subtitle="No matching teams have solved this challenge."
          />
        {:else if urlState.search}
          <EmptyState
            icon={IconSearch}
            title="No teams found"
            subtitle="Try a different search term."
          />
        {:else}
          <EmptyState
            icon={IconTrophy}
            title="No scores yet"
            subtitle="Check back once teams start solving."
          />
        {/if}
      </scores-leaderboard-slot>
    {/if}

    {#if screenshotOpen}
      <ScoresScreenshotModal
        open={screenshotOpen}
        onOpenChange={open => (screenshotOpen = open)}
        teams={screenshotTeams}
        selfTeam={screenshotSelfTeam}
        graphData={data.graphData}
        categoryGroups={data.categoryGroups}
        solvesByTeam={screenshotSolvesByTeam}
        ctfName={ctfName ?? ''}
        {startTime}
        {endTime}
      />
    {/if}
  </scores-page>
{/if}

<style>
  scores-page {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
    block-size: calc(100dvh - var(--header-height));
    max-block-size: calc(100dvh - var(--header-height));
    overflow: hidden;
    padding-block-end: 1rem;
  }

  scores-frame {
    display: flex;
    flex: 1;
    justify-content: center;
    min-block-size: 0;
    max-inline-size: 100%;
    padding-inline: 1rem;

    @media (width >= 48rem) {
      padding-inline: 2.25rem;
    }
  }

  scores-leaderboard-slot {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    min-block-size: 0;
  }
</style>

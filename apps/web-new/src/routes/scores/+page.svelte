<script lang="ts">
  import CtfNotStarted from '$lib/components/ctf-not-started.svelte'
  import IconSearch from '$lib/icons/icon-search.svelte'
  import IconTrophy from '$lib/icons/icon-trophy-filled.svelte'
  import { useClientConfig } from '$lib/query/config'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { createScoresData } from './model/data.svelte'
  import ScoresLeaderboard from './leaderboard/leaderboard.svelte'
  import ScoresToolbar from './toolbar/toolbar.svelte'
  import { createScoresRouteState } from './model/url-state.svelte'

  const configQuery = useClientConfig()
  const ctfName = $derived(configQuery.data?.ctfName)
  const divisions = $derived(configQuery.data?.divisions ?? {})
  const startTime = $derived(configQuery.data?.startTime ?? 0)

  const urlState = createScoresRouteState()

  const data = createScoresData({
    division: () => urlState.division,
    search: () => urlState.search,
    sortMode: () => urlState.sortMode,
    showTop3Context: () => urlState.showTop3Context,
    showSelfContext: () => urlState.showSelfContext,
  })

  // Non-reactive read: true only when this visit actually starts behind the
  // spinner. A revisit with warm cache mounts the board directly and should
  // not replay the reveal fade.
  const revealAfterLoading = data.isLoading
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
    <ScoresToolbar {data} {urlState} {divisions} />

    {#if data.isLoading}
      <!-- Everything (rows, cells, graph) loads behind one spinner — the old
           app's behavior; no progressively-filling skeleton. -->
      <scores-leaderboard-slot>
        <Spinner />
      </scores-leaderboard-slot>
    {:else if data.entries.length > 0}
      <scores-frame data-reveal={revealAfterLoading || undefined}>
        <ScoresLeaderboard {data} {urlState} {divisions} {startTime} />
      </scores-frame>
    {:else}
      <scores-leaderboard-slot>
        {#if urlState.search}
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
  </scores-page>
{/if}

<style>
  scores-page {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
    /* Hard-cap the page to the viewport so the leaderboard's inner scroll
       region is bounded; the app shell only sets min-block-size: 100dvh, so
       flex:1 alone would let the tall virtual list grow the page instead. */
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

<script lang="ts">
  import CtfNotStarted from '$lib/components/ctf-not-started.svelte'
  import IconSearch from '$lib/icons/icon-search.svelte'
  import IconTrophy from '$lib/icons/icon-trophy-filled.svelte'
  import { useClientConfig } from '$lib/query/config'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import { createScoresData } from './scores-data.svelte'
  import ScoresLeaderboard from './scores-leaderboard.svelte'
  import ScoresToolbar from './scores-toolbar.svelte'
  import { createScoresRouteState } from './scores-url-state.svelte'

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

  const hasBoard = $derived(data.isLoading || data.entries.length > 0)
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

    {#if hasBoard}
      <ScoresLeaderboard {data} {urlState} {divisions} {startTime} />
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
  }

  scores-leaderboard-slot {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    min-block-size: 0;
  }
</style>

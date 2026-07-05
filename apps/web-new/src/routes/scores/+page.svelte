<script lang="ts">
  import CtfNotStarted from '$lib/components/ctf-not-started.svelte'
  import IconBinaryTree from '$lib/icons/icon-binary-tree-filled.svelte'
  import IconFold from '$lib/icons/icon-fold.svelte'
  import IconSearch from '$lib/icons/icon-search.svelte'
  import IconTable from '$lib/icons/icon-table-filled.svelte'
  import IconTrophy from '$lib/icons/icon-trophy-filled.svelte'
  import { useClientConfig } from '$lib/query/config'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import type { Component } from 'svelte'
  import { createScoresRouteState } from './scores-url-state.svelte'

  type LeaderboardState = 'not-started' | 'empty' | 'search-empty'

  const configQuery = useClientConfig()
  const ctfName = $derived(configQuery.data?.ctfName)
  const startTime = $derived(configQuery.data?.startTime ?? 0)

  const urlState = createScoresRouteState()

  // Placeholder for the leaderboard region. U5 replaces this with the real
  // with-graph query: not-started from ApiError.isNotStarted, and
  // empty/search-empty from the flat-mapped results. The slot markup below is
  // structured so U5 drops the virtualized table in alongside these states.
  const leaderboardState = $derived<LeaderboardState>(
    startTime > 0 && Date.now() < startTime
      ? 'not-started'
      : urlState.search
        ? 'search-empty'
        : 'empty'
  )
</script>

<svelte:head>
  {#if ctfName}
    <title>Scores | {ctfName}</title>
  {/if}
</svelte:head>

{#snippet toggle(label: string, Icon: Component, active: boolean, onclick: () => void)}
  <button type="button" data-active={active || undefined} aria-pressed={active} {onclick}>
    <Icon />
    <span>{label}</span>
  </button>
{/snippet}

{#if leaderboardState === 'not-started'}
  <CtfNotStarted />
{:else}
  <scores-page>
    <scores-toolbar role="toolbar" aria-label="Scoreboard controls">
      <toggle-group aria-label="View">
        {@render toggle('Challenges', IconTable, urlState.viewMode === 'challenges', () =>
          urlState.setViewMode('challenges')
        )}
        {@render toggle('Categories', IconBinaryTree, urlState.viewMode === 'categories', () =>
          urlState.setViewMode('categories')
        )}
      </toggle-group>

      {#if urlState.viewMode === 'challenges'}
        <toggle-group aria-label="Sort">
          {@render toggle('Category', IconFold, urlState.sortMode === 'categories', () =>
            urlState.setSortMode('categories')
          )}
          {@render toggle('Solves', IconTrophy, urlState.sortMode === 'solves', () =>
            urlState.setSortMode('solves')
          )}
        </toggle-group>
      {/if}
    </scores-toolbar>

    <!-- U5 wires the virtualized leaderboard table + graph into this region. -->
    <scores-leaderboard-slot>
      {#if leaderboardState === 'search-empty'}
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
  </scores-page>
{/if}

<style>
  scores-page {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
    block-size: calc(100dvh - var(--header-height));
  }

  scores-toolbar {
    display: flex;
    flex-wrap: wrap;
    flex-shrink: 0;
    gap: var(--space-xs);
    padding: var(--space-s) var(--space-m);
  }

  toggle-group {
    display: flex;
    gap: 0.25rem;

    button {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2xs);
      block-size: 2.25rem;
      padding-inline: var(--space-s);
      color: var(--foreground-l1);
      background: var(--background-l4);
      border-radius: var(--radius-md);
      cursor: pointer;
      white-space: nowrap;

      :global(svg) {
        font-size: 1.125rem;
      }

      &:hover {
        background: var(--background-l5);
      }

      &[data-active] {
        color: var(--foreground-accent);
        background: var(--background-accent);

        &:hover {
          background: var(--background-accent-hover);
        }
      }

      &:focus-visible {
        outline: 2px solid var(--ring);
        outline-offset: 2px;
      }
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

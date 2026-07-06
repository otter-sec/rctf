<!--
  Public profile route (/profile/[id]). Renders another team's profile with no
  auth gate: the shared header, the read-only challenges/solves list, and the
  analytics column (score-over-time graph). The graph reuses the own-profile
  offset-hack query with the public caching policy (no poll, 5-min staleTime);
  it draws the solve progression when the leaderboard-offset probe resolves and
  falls back to ProfileGraph's "No score graph data." empty state otherwise
  (unranked or stale-rank teams — R15/AE4).

  Single-instance layout mirrors the own profile (/profile): every section is
  rendered exactly once and a CSS grid + media query rearranges them. A local
  `activeTab` drives a plain tablist rather than lib/ui/tabs.svelte so the desktop
  layout can keep analytics permanently visible in the right column without
  reaching into a Zag machine's internals. Mobile shows one panel at a time
  (Challenges / Analytics); at >=64rem the tablist is hidden and analytics moves
  to an always-visible right column beside the header + solves list.
-->
<script lang="ts">
  import { page } from '$app/state'
  import { useClientConfig } from '$lib/query/config'
  import {
    PUBLIC_GRAPH_CACHING,
    useLeaderboardChallenges,
    useSelfUserGraph,
  } from '$lib/query/leaderboard'
  import { useUserById } from '$lib/query/user'
  import Button from '$lib/ui/button.svelte'
  import Card from '$lib/ui/card.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import type { ChallengeInfo } from '../profile-analytics-data'
  import ProfileAnalytics from '../profile-analytics.svelte'
  import type { GraphSampleInput } from '../profile-graph-data'
  import ProfileHeader from '../profile-header.svelte'
  import ProfileSolves from '../profile-solves.svelte'

  const userId = $derived(page.params.id ?? '')
  const userQuery = useUserById(() => userId)
  const configQuery = useClientConfig()
  const challengesQuery = useLeaderboardChallenges()

  const user = $derived(userQuery.data)
  const clientConfig = $derived(configQuery.data)
  const ctfName = $derived(clientConfig?.ctfName)

  const challenges = $derived<ChallengeInfo[]>(
    Object.entries(challengesQuery.data ?? {}).map(([id, challenge]) => ({
      id,
      name: challenge.name,
      category: challenge.category,
      points: challenge.points,
      solves: challenge.solves,
      scoringKind: challenge.scoringKind,
    }))
  )

  const graphQuery = useSelfUserGraph(
    () => user?.globalPlace ?? null,
    () => userId,
    PUBLIC_GRAPH_CACHING
  )
  const graphData = $derived<GraphSampleInput>(graphQuery.data ?? { points: [] })

  type ProfileTab = 'challenges' | 'analytics'
  const tabs: { value: ProfileTab; label: string }[] = [
    { value: 'challenges', label: 'Challenges' },
    { value: 'analytics', label: 'Analytics' },
  ]
  let activeTab = $state<ProfileTab>('challenges')
</script>

<svelte:head>
  {#if user && ctfName}
    <title>{user.name} | {ctfName}</title>
  {:else if ctfName}
    <title>Profile not found | {ctfName}</title>
  {/if}
</svelte:head>

{#if userQuery.isPending}
  <profile-status>
    <Spinner />
  </profile-status>
{:else if !user || !clientConfig}
  <profile-status>
    <Card title="Profile not found">
      <p>{userQuery.error?.message ?? 'The requested profile could not be found.'}</p>
      <Button href="/scores">View leaderboard</Button>
    </Card>
  </profile-status>
{:else}
  <profile-page data-active-tab={activeTab}>
    <profile-header-slot>
      <ProfileHeader {user} divisions={clientConfig.divisions} />
    </profile-header-slot>

    <profile-tabbar role="tablist" aria-label="Profile sections">
      {#each tabs as tab (tab.value)}
        <button
          type="button"
          role="tab"
          id="profile-tab-{tab.value}"
          aria-controls="profile-panel-{tab.value}"
          aria-selected={activeTab === tab.value}
          data-tab={tab.value}
          data-selected={activeTab === tab.value || undefined}
          onclick={() => (activeTab = tab.value)}
        >
          {tab.label}
        </button>
      {/each}
    </profile-tabbar>

    <profile-panel
      role="tabpanel"
      id="profile-panel-challenges"
      aria-labelledby="profile-tab-challenges"
      data-tab="challenges"
    >
      <ProfileSolves
        {challenges}
        solves={user.solves}
        dynamicScores={user.dynamicScores}
        showUnsolved={challenges.length > 0}
        ctfStartTime={clientConfig.startTime}
      />
    </profile-panel>

    <profile-panel
      role="tabpanel"
      id="profile-panel-analytics"
      aria-labelledby="profile-tab-analytics"
      data-tab="analytics"
    >
      <ProfileAnalytics
        solves={user.solves}
        dynamicScores={user.dynamicScores}
        {graphData}
        startTime={clientConfig.startTime}
        endTime={clientConfig.endTime}
        splitDynamicScore={user.dynamicScores.length > 0}
      />
    </profile-panel>
  </profile-page>
{/if}

<style>
  profile-status {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: var(--space-l);
  }

  profile-page {
    display: grid;
    grid-template:
      'header' auto
      'tabbar' auto
      'content' 1fr
      / minmax(0, 1fr);
    gap: var(--space-s);
    inline-size: 100%;
    max-inline-size: 48rem;
    margin-inline: auto;
    padding-inline: var(--space-m);
    padding-block-end: var(--space-m);
    block-size: calc(100dvh - var(--header-height));
    max-block-size: calc(100dvh - var(--header-height));
    overflow: hidden;
  }

  profile-header-slot {
    grid-area: header;
    display: block;
  }

  profile-tabbar {
    grid-area: tabbar;
    display: flex;
    gap: var(--space-3xs);
  }

  profile-tabbar button {
    flex: 1;
    padding-block: var(--space-2xs);
    color: var(--foreground-l2);
    background: var(--background-l1);
    cursor: pointer;
    border-radius: var(--radius-md);

    &[data-selected] {
      color: var(--foreground-l0);
      background: var(--background-l2);
    }
  }

  /* Both panels occupy the same cell; only the active one shows (mobile). */
  profile-panel {
    grid-area: content;
    display: none;
    min-block-size: 0;
  }

  profile-panel[data-tab='challenges'] {
    overflow: hidden;
  }

  profile-panel[data-tab='analytics'] {
    gap: var(--space-m);
    overflow-y: auto;
  }

  profile-page[data-active-tab='challenges'] profile-panel[data-tab='challenges'],
  profile-page[data-active-tab='analytics'] profile-panel[data-tab='analytics'] {
    display: flex;
    flex-direction: column;
  }

  @media (width >= 64rem) {
    profile-page {
      max-inline-size: 100rem;
      grid-template:
        'header  analytics' auto
        'tabbar  analytics' auto
        'content analytics' 1fr
        / minmax(0, 1fr) minmax(0, 1fr);
      column-gap: var(--space-m);
    }

    /* Tabs are a mobile-only affordance; both panels stay visible on desktop. */
    profile-tabbar {
      display: none;
    }

    /* Challenges always fills the left content column. */
    profile-page profile-panel[data-tab='challenges'] {
      display: flex;
      flex-direction: column;
    }

    /* Analytics always visible in its own right column. */
    profile-page profile-panel[data-tab='analytics'] {
      grid-area: analytics;
      display: flex;
      flex-direction: column;
    }
  }
</style>

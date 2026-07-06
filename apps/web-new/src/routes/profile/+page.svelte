<!--
  Own profile route (/profile). Auth-gated shell that wires the shared header,
  the challenges/solves list, the analytics column, and the settings sections.

  Single-instance layout (fixes the old app's dual mobile/desktop render): every
  section is rendered exactly once and a CSS grid + media query rearranges them.
  Tab switching is driven by a local `activeTab` on a plain tablist rather than
  lib/ui/tabs.svelte, because that primitive keeps all panels mounted and toggles
  them with the `hidden` attribute from its own Zag machine — which cannot also
  keep the settings panel permanently visible in the desktop right column without
  reaching into its internals. Mobile shows one panel at a time (Challenges /
  Analytics / Settings); at >=64rem the settings trigger is hidden and the
  settings panel moves to an always-visible right column.
-->
<script lang="ts">
  import { useClientConfig } from '$lib/query/config'
  import { useLeaderboardChallenges, useSelfUserGraph } from '$lib/query/leaderboard'
  import { useCurrentUser } from '$lib/query/user'
  import Button from '$lib/ui/button.svelte'
  import Card from '$lib/ui/card.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import type { ChallengeInfo } from './profile-analytics-data'
  import ProfileAnalytics from './profile-analytics.svelte'
  import type { GraphSampleInput } from './profile-graph-data'
  import ProfileHeader from './profile-header.svelte'
  import ProfileSettingsAccount from './profile-settings-account.svelte'
  import ProfileSettingsAvatar from './profile-settings-avatar.svelte'
  import ProfileSettingsCtftime from './profile-settings-ctftime.svelte'
  import ProfileSettingsMembers from './profile-settings-members.svelte'
  import ProfileSolves from './profile-solves.svelte'

  const userQuery = useCurrentUser()
  const configQuery = useClientConfig()
  const challengesQuery = useLeaderboardChallenges()

  const user = $derived(userQuery.data)
  const clientConfig = $derived(configQuery.data)
  const ctfName = $derived(clientConfig?.ctfName)
  const isLoading = $derived(userQuery.isLoading || configQuery.isLoading)

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
    () => user?.id ?? null
  )
  const graphData = $derived<GraphSampleInput | null>(graphQuery.data ?? null)

  type ProfileTab = 'challenges' | 'analytics' | 'settings'
  const tabs: { value: ProfileTab; label: string }[] = [
    { value: 'challenges', label: 'Challenges' },
    { value: 'analytics', label: 'Analytics' },
    { value: 'settings', label: 'Settings' },
  ]
  let activeTab = $state<ProfileTab>('challenges')
</script>

<svelte:head>
  {#if ctfName}
    <title>Profile | {ctfName}</title>
  {/if}
</svelte:head>

{#if isLoading}
  <profile-status>
    <Spinner />
  </profile-status>
{:else if !user || !clientConfig}
  <profile-status>
    <Card title="Profile">
      <p>You need to be logged in to view your profile.</p>
      <Button href="/login">Login</Button>
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
        {clientConfig}
        {challenges}
        splitDynamicScore={user.dynamicScores.length > 0}
      />
    </profile-panel>

    <profile-panel
      role="tabpanel"
      id="profile-panel-settings"
      aria-labelledby="profile-tab-settings"
      data-tab="settings"
    >
      <ProfileSettingsAvatar {user} {clientConfig} />
      <ProfileSettingsAccount {user} {clientConfig} />
      <ProfileSettingsCtftime {user} {clientConfig} />
      <ProfileSettingsMembers {clientConfig} />
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

  /* All three panels occupy the same cell; only the active one shows (mobile). */
  profile-panel {
    grid-area: content;
    display: none;
    min-block-size: 0;
  }

  profile-panel[data-tab='challenges'] {
    overflow: hidden;
  }

  profile-panel[data-tab='analytics'],
  profile-panel[data-tab='settings'] {
    gap: var(--space-m);
    overflow-y: auto;
  }

  profile-page[data-active-tab='challenges'] profile-panel[data-tab='challenges'],
  profile-page[data-active-tab='analytics'] profile-panel[data-tab='analytics'],
  profile-page[data-active-tab='settings'] profile-panel[data-tab='settings'] {
    display: flex;
    flex-direction: column;
  }

  @media (width >= 64rem) {
    profile-page {
      max-inline-size: 100rem;
      grid-template:
        'header  settings' auto
        'tabbar  settings' auto
        'content settings' 1fr
        / minmax(0, 1fr) minmax(0, 1fr);
      column-gap: var(--space-m);
    }

    /* Settings is a third tab only on mobile. */
    profile-tabbar button[data-tab='settings'] {
      display: none;
    }

    /* Settings always visible in its own column. */
    profile-page profile-panel[data-tab='settings'] {
      grid-area: settings;
      display: flex;
      flex-direction: column;
    }

    /* Left content shows analytics when selected, challenges otherwise. */
    profile-page profile-panel[data-tab='challenges'] {
      display: flex;
      flex-direction: column;
    }

    profile-page profile-panel[data-tab='analytics'] {
      display: none;
    }

    profile-page[data-active-tab='analytics'] profile-panel[data-tab='challenges'] {
      display: none;
    }

    profile-page[data-active-tab='analytics'] profile-panel[data-tab='analytics'] {
      display: flex;
      flex-direction: column;
    }
  }
</style>

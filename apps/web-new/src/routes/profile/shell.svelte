<script lang="ts">
  import Spinner from '$lib/ui/spinner.svelte'
  import { createRovingFocus } from '$lib/utils/roving'
  import { untrack, type Snippet } from 'svelte'

  type Tab = { value: string; label: string }

  type Props = {
    tabs: Tab[]
    desktopColumn: string
    hideTablistOnDesktop?: boolean
    status: 'loading' | 'unavailable' | 'ready'
    header: Snippet
    panel: Snippet<[string]>
    unavailable: Snippet
  }

  let {
    tabs,
    desktopColumn,
    hideTablistOnDesktop = false,
    status,
    header,
    panel,
    unavailable,
  }: Props = $props()

  let activeTab = $state(untrack(() => tabs[0]?.value ?? ''))

  const revealAfterLoading = untrack(() => status) === 'loading'

  const rovingFocus = createRovingFocus()
</script>

{#if status === 'loading'}
  <profile-status>
    <Spinner />
  </profile-status>
{:else if status === 'unavailable'}
  <profile-status>
    {@render unavailable()}
  </profile-status>
{:else}
  <profile-page
    data-active-tab={activeTab}
    data-desktop-column={desktopColumn}
    data-hide-tablist={hideTablistOnDesktop || undefined}
    data-reveal={revealAfterLoading || undefined}
  >
    <column-surface data-main></column-surface>
    <column-surface data-aside></column-surface>

    <profile-header-slot>
      {@render header()}
    </profile-header-slot>

    <profile-tabbar role="tablist" aria-label="Profile sections" {@attach rovingFocus}>
      {#each tabs as tab (tab.value)}
        <button
          type="button"
          role="tab"
          data-roving
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

    {#each tabs as tab (tab.value)}
      <profile-panel
        role="tabpanel"
        id="profile-panel-{tab.value}"
        aria-labelledby="profile-tab-{tab.value}"
        data-tab={tab.value}
      >
        {@render panel(tab.value)}
      </profile-panel>
    {/each}
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
    row-gap: var(--space-s);
    inline-size: 100%;
    max-inline-size: 48rem;
    margin-inline: auto;
    padding-inline: 1rem;
    block-size: calc(100dvh - var(--header-height));
    max-block-size: calc(100dvh - var(--header-height));
    overflow: hidden;

    @media (width >= 48rem) {
      padding-inline: 2.25rem;
    }
  }

  column-surface {
    display: block;
    background: var(--background-l1);
    border-radius: var(--radius-3xl) var(--radius-3xl) 0 0;

    &[data-main] {
      grid-area: 1 / 1 / -1 / 2;
    }

    &[data-aside] {
      display: none;
    }
  }

  profile-header-slot {
    grid-area: header;
    display: block;
    padding-block-start: var(--space-m);
    padding-inline: var(--space-l);
  }

  profile-tabbar {
    grid-area: tabbar;
    display: flex;
    gap: var(--space-3xs);
    padding-inline: var(--space-s);

    button {
      flex: 1;
      padding-block: var(--space-2xs);
      color: var(--foreground-l2);
      background: var(--background-l2);
      cursor: pointer;
      border-radius: var(--radius-md);

      &[data-selected] {
        color: var(--foreground-l0);
        background: var(--background-l3);
      }
    }
  }

  profile-panel {
    grid-area: content;
    display: none;
    min-block-size: 0;

    &[data-tab='challenges'] {
      overflow: hidden;
    }

    &[data-tab='analytics'],
    &[data-tab='settings'] {
      gap: var(--space-m);
      padding-inline: var(--space-m);
      padding-block-end: var(--space-m);
      overflow-y: auto;
      overscroll-behavior: none;
    }
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
        'header  aside' auto
        'tabbar  aside' auto
        'content aside' 1fr
        / minmax(0, 1fr) minmax(0, 1fr);
      column-gap: var(--space-2xs);
    }

    column-surface[data-main] {
      grid-area: 1 / 1 / -1 / 2;
    }

    column-surface[data-aside] {
      display: block;
      grid-area: 1 / 2 / -1 / 3;
    }

    profile-page[data-desktop-column='settings'] profile-panel[data-tab='settings'],
    profile-page[data-desktop-column='analytics'] profile-panel[data-tab='analytics'] {
      padding-block-start: var(--space-m);
    }

    profile-page[data-hide-tablist] profile-tabbar {
      display: none;
    }

    profile-tabbar button[data-tab='settings'] {
      display: none;
    }

    profile-page[data-desktop-column='settings'] profile-panel[data-tab='settings'],
    profile-page[data-desktop-column='analytics'] profile-panel[data-tab='analytics'] {
      grid-area: aside;
      display: flex;
      flex-direction: column;
    }

    profile-page profile-panel[data-tab='challenges'] {
      display: flex;
      flex-direction: column;
    }

    profile-page[data-desktop-column='settings'] profile-panel[data-tab='analytics'] {
      display: none;
    }

    profile-page[data-desktop-column='settings'][data-active-tab='analytics']
      profile-panel[data-tab='challenges'] {
      display: none;
    }

    profile-page[data-desktop-column='settings'][data-active-tab='analytics']
      profile-panel[data-tab='analytics'] {
      display: flex;
      flex-direction: column;
    }
  }
</style>

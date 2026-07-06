<!--
  Shared layout shell for the own (/profile) and public (/profile/[id]) profile
  routes. Owns the status card, the single-instance grid, the plain tablist, and
  every panel wrapper so the two routes only supply data, titles, status copy,
  and per-panel content.

  Single-instance layout (fixes the old app's dual mobile/desktop render): every
  section is rendered exactly once and a CSS grid + media query rearranges them.
  Tab switching is driven by a local `activeTab` on a plain tablist rather than
  lib/ui/tabs.svelte, because that primitive keeps all panels mounted and toggles
  them with the `hidden` attribute from its own Zag machine — which cannot also
  keep one panel permanently visible in the desktop right column without reaching
  into its internals. Mobile shows one panel at a time; at >=64rem the panel named
  by `desktopColumn` moves to an always-visible right column.

  The two routes differ only in two parameters, both preserved here:
  - `desktopColumn`: which tab becomes the always-visible desktop right column
    (own: settings, public: analytics). The left column shows challenges by
    default, or the active tab when a non-column tab is selected — so an own
    profile with a stale `settings` selection still shows challenges on the left.
  - `hideTablistOnDesktop`: public hides the whole tablist at >=64rem (both panels
    stay visible); own keeps the tablist but hides only the settings trigger,
    since settings is a third tab on mobile only.
-->
<script lang="ts">
  import Spinner from '$lib/ui/spinner.svelte'
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

  // `tabs` is a fixed per-route array, so the first tab is a stable default.
  let activeTab = $state(untrack(() => tabs[0]?.value ?? ''))
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
  >
    <profile-header-slot>
      {@render header()}
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

  /* All panels occupy the same cell; only the active one shows (mobile). */
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
        'header  aside' auto
        'tabbar  aside' auto
        'content aside' 1fr
        / minmax(0, 1fr) minmax(0, 1fr);
      column-gap: var(--space-m);
    }

    /* Public hides the whole tablist; own keeps it and hides only the settings
       trigger (settings is a third tab on mobile only). */
    profile-page[data-hide-tablist] profile-tabbar {
      display: none;
    }

    profile-tabbar button[data-tab='settings'] {
      display: none;
    }

    /* The desktop-column panel is always visible in its own right column. */
    profile-page[data-desktop-column='settings'] profile-panel[data-tab='settings'],
    profile-page[data-desktop-column='analytics'] profile-panel[data-tab='analytics'] {
      grid-area: aside;
      display: flex;
      flex-direction: column;
    }

    /* Challenges always fills the left content column by default. */
    profile-page profile-panel[data-tab='challenges'] {
      display: flex;
      flex-direction: column;
    }

    /* When settings is the desktop column, analytics is a left-column tab that
       replaces challenges only while it is the active selection. */
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

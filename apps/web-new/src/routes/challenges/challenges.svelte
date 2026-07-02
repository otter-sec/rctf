<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { afterNavigate, pushState, replaceState } from '$app/navigation'
  import { page } from '$app/state'
  import {
    deriveBloodIds,
    deriveSolvedIds,
    invalidateAfterSolve,
    useChallenges,
  } from '$lib/query/challenges'
  import { useCurrentUser } from '$lib/query/user'
  import Dialog from '$lib/ui/dialog.svelte'
  import Splitter from '$lib/ui/splitter.svelte'
  import { tick } from 'svelte'
  import { SvelteSet } from 'svelte/reactivity'
  import ChallengeDetails from './challenges-details.svelte'
  import ChallengesList from './challenges-list.svelte'
  import { getDeepLinkId, resolveClose, type CloseSource } from './drawer-history'

  // Prop contract the list and detail panes are wired against; kept explicit so
  // the two render sites (desktop panes, mobile drawer) stay in sync.
  type ChallengeListProps = {
    challenges: Challenge[]
    solvedIds: ReadonlySet<string>
    bloodIds: { gold: Set<string>; silver: Set<string>; bronze: Set<string> }
    selectedId: string | null
    onSelect: (challenge: Challenge) => void
    // U5: force-expand this challenge's category and bypass hide-solved for its
    // row so a deep link always reveals the target. Null once nothing is pending.
    deepLinkTarget: string | null
  }
  type ChallengeDetailProps = {
    challenge: Challenge | null
    isSolved: boolean
    onSolve: (challengeId: string) => void
    // Lifted above the per-challenge remount so the active tab survives
    // switching challenges.
    tab: string
    onTabChange: (tab: string) => void
  }

  const DESKTOP_MIN_WIDTH = 768
  const WIDE_MIN_WIDTH = 1280

  const queryClient = useQueryClient()
  const challengesQuery = useChallenges()
  const userQuery = useCurrentUser()

  const challenges = $derived(challengesQuery.data ?? [])
  const challengeIds = $derived(new Set(challenges.map(c => c.id)))
  const selfSolves = $derived(userQuery.data?.solves)

  const localSolvedIds = new SvelteSet<string>()
  const solvedIds = $derived(deriveSolvedIds(selfSolves, localSolvedIds))
  const bloodIds = $derived(deriveBloodIds(selfSolves))

  let selectedId = $state<string | null>(null)
  let detailsTab = $state('details')
  let deepLinkTarget = $state<string | null>(null)
  let innerWidth = $state(0)
  // Router readiness gates shallow routing (pushState throws before the first
  // navigation settles). pendingDrawerId defers a cold deep-link's mobile drawer
  // open until afterNavigate fires.
  let routerReady = $state(false)
  let pendingDrawerId = $state<string | null>(null)

  const isMobile = $derived(innerWidth > 0 && innerWidth < DESKTOP_MIN_WIDTH)
  const listMinSize = $derived(innerWidth < WIDE_MIN_WIDTH ? 40 : 20)

  const selectedChallenge = $derived(
    selectedId ? (challenges.find(c => c.id === selectedId) ?? null) : null
  )
  const selectedIsSolved = $derived(selectedChallenge ? solvedIds.has(selectedChallenge.id) : false)

  const drawerOpen = $derived(
    isMobile && selectedId !== null && page.state.challengeDrawer === true
  )

  function challengeUrl(id: string): string {
    const url = new URL(page.url)
    url.searchParams.set('challenge', id)
    return `${url.pathname}${url.search}`
  }

  // Mobile open pushes a history entry (page.state.challengeDrawer) so Back
  // dismisses the drawer; the URL carries the param because state is lost on
  // reload. The param must live on the pushed entry, not page.state alone.
  function openDrawer(id: string) {
    pushState(challengeUrl(id), { challengeDrawer: true })
  }

  function closeDrawer(source: CloseSource) {
    if (resolveClose(source, page.state.challengeDrawer === true) === 'history-back') {
      history.back()
    }
    // 'close-direct': the entry is already gone (Back) or was never pushed, so
    // page.state reactivity closes the drawer with nothing more to do.
  }

  function handleSelect(challenge: Challenge) {
    selectedId = challenge.id
    if (!isMobile) {
      // Desktop selection is history-silent so Back never walks selections.
      replaceState(challengeUrl(challenge.id), { ...page.state })
    } else if (page.state.challengeDrawer === true) {
      // Drawer already open: swap the challenge without stacking a new entry.
      replaceState(challengeUrl(challenge.id), { challengeDrawer: true })
    } else {
      openDrawer(challenge.id)
    }
  }

  function handleDrawerOpenChange(open: boolean) {
    // Opening is driven by us via pushState; only react to user-initiated closes
    // (Esc, backdrop, close button all surface here identically).
    if (!open) closeDrawer('backdrop')
  }

  function handleSolve(challengeId: string) {
    invalidateAfterSolve(queryClient, challengeId, id => localSolvedIds.add(id))
  }

  // Deep-link latch: once, after challenges load and the form factor is known,
  // restore the ?challenge= selection, open the drawer on mobile, and scroll to
  // the row. The row mounts a frame or two after the data lands (accordion
  // content renders behind the machine), so retry briefly instead of once.
  function scrollToRow(id: string, attempts = 60) {
    const el = document.getElementById(`chall-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'instant', block: 'center' })
    } else if (attempts > 0) {
      requestAnimationFrame(() => scrollToRow(id, attempts - 1))
    }
  }

  let latched = $state(false)
  $effect(() => {
    if (latched || challenges.length === 0 || innerWidth === 0) return

    const id = getDeepLinkId(page.url, challengeIds)
    if (id) {
      selectedId = id
      deepLinkTarget = id
      pendingDrawerId = isMobile ? id : null
      void tick().then(() => scrollToRow(id))
    }
    latched = true
  })

  // Shallow routing (pushState) throws until SvelteKit's router has finished its
  // first navigation, which on a cold deep-link load happens after the initial
  // latch effect. afterNavigate fires once the router is ready; open the mobile
  // deep-link drawer then. Runtime selections happen well after this, so they
  // push directly.
  afterNavigate(() => {
    routerReady = true
    if (pendingDrawerId && isMobile && page.state.challengeDrawer !== true) {
      const id = pendingDrawerId
      pendingDrawerId = null
      openDrawer(id)
    }
  })

  // Keep the drawer/selection consistent across the desktop/mobile boundary,
  // mirroring the old wasMobile latch but routing through history.
  let wasMobile = $state(false)
  $effect(() => {
    const mobile = isMobile
    if (wasMobile === mobile) return
    wasMobile = mobile
    if (!mobile) {
      // mobile → desktop: drop the drawer entry, keep the selection for the pane.
      if (page.state.challengeDrawer === true) closeDrawer('resize-to-desktop')
    } else if (routerReady && selectedId && page.state.challengeDrawer !== true) {
      // desktop → mobile with a selection: re-open the drawer. Before the router
      // is ready the cold-load latch owns the initial mobile open (pendingDrawerId).
      openDrawer(selectedId)
    }
  })

  const listProps = $derived<ChallengeListProps>({
    challenges,
    solvedIds,
    bloodIds,
    selectedId: selectedChallenge?.id ?? null,
    onSelect: handleSelect,
    deepLinkTarget,
  })
  const detailProps = $derived<ChallengeDetailProps>({
    challenge: selectedChallenge,
    isSolved: selectedIsSolved,
    onSolve: handleSolve,
    tab: detailsTab,
    onTabChange: tab => (detailsTab = tab),
  })
</script>

<svelte:window bind:innerWidth />

{#snippet listPane(props: ChallengeListProps)}
  <challenges-list-slot>
    <ChallengesList {...props} />
  </challenges-list-slot>
{/snippet}

{#snippet detailPane(props: ChallengeDetailProps)}
  <challenges-detail-slot>
    <!-- Remount per challenge so form/sub-query state resets on switch. -->
    {#key props.challenge?.id}
      <ChallengeDetails {...props} />
    {/key}
  </challenges-detail-slot>
{/snippet}

{#if isMobile}
  <challenges-page data-form="mobile">
    <pane-surface data-side="list">{@render listPane(listProps)}</pane-surface>
    <Dialog
      open={drawerOpen}
      onOpenChange={handleDrawerOpenChange}
      title={selectedChallenge?.name ?? 'Challenge details'}
      titleHidden
      presentation="drawer"
      flush
    >
      <drawer-body>{@render detailPane(detailProps)}</drawer-body>
    </Dialog>
  </challenges-page>
{:else}
  <challenges-page data-form="desktop">
    <Splitter
      panels={[
        { id: 'list', minSize: listMinSize, maxSize: 50 },
        { id: 'detail', minSize: 40 },
      ]}
      defaultSize={[40, 60]}
    >
      {#snippet a()}
        <pane-surface data-side="list">{@render listPane(listProps)}</pane-surface>
      {/snippet}
      {#snippet b()}
        <pane-surface data-side="detail">{@render detailPane(detailProps)}</pane-surface>
      {/snippet}
    </Splitter>
  </challenges-page>
{/if}

<style>
  /* Lock the page to the space under the header; the list and details panes
     own their scrolling. */
  challenges-page {
    display: flex;
    block-size: calc(100dvh - var(--header-height));
    min-block-size: 0;
    --splitter-handle-size: 0.5rem;
  }

  challenges-page[data-form='mobile'] {
    flex-direction: column;
  }

  pane-surface {
    display: flex;
    flex-direction: column;
    block-size: 100%;
    overflow: hidden;
    background: var(--background-l1);
  }

  challenges-page[data-form='mobile'] pane-surface[data-side='list'] {
    flex: 1;
    min-block-size: 0;
  }

  pane-surface[data-side='list'] {
    border-start-end-radius: var(--radius-3xl);
    border-end-end-radius: var(--radius-3xl);
  }

  pane-surface[data-side='detail'] {
    border-start-start-radius: var(--radius-3xl);
    border-end-start-radius: var(--radius-3xl);
  }

  challenges-list-slot,
  challenges-detail-slot {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  challenges-detail-slot {
    align-items: center;
    justify-content: center;
  }

  drawer-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
    overflow: auto;
  }

  /* Portaled drawer content escapes this subtree, so size it via a global knob
     scoped to the drawer presentation. Only the challenges drawer uses it. */
  :global([data-presentation='drawer']) {
    --dialog-drawer-max-size: 92dvh;
  }
</style>

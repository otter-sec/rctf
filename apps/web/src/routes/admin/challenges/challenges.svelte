<script lang="ts">
  import type { AdminChallenge } from '@rctf/types'
  import { useAdminChallenge, useAdminChallenges } from '$lib/query/admin'
  import Dialog from '$lib/ui/dialog.svelte'
  import Splitter from '$lib/ui/splitter.svelte'
  import { handlePaneArrowKey } from '$lib/utils/pane-keynav'
  import AdminChallengesDetails from './details/details.svelte'
  import AdminChallengesList from './list/list.svelte'
  import {
    create,
    createEditorState,
    detailLoaded,
    select,
    type EditorState,
  } from './model/editor-state'

  const DESKTOP_MIN_WIDTH = 768
  const WIDE_MIN_WIDTH = 1280

  const challengesQuery = useAdminChallenges()
  const challenges = $derived(challengesQuery.data ?? [])

  let editor = $state<EditorState>(createEditorState())

  const selectedId = $derived(editor.challenge?.id ?? null)
  const isCreating = $derived(editor.mode === 'creating')

  const detailQuery = useAdminChallenge(() => selectedId)
  $effect(() => {
    const detail = detailQuery.data
    if (detail) {
      editor = detailLoaded(editor, detail)
    }
  })

  let innerWidth = $state(0)
  const isMobile = $derived(innerWidth > 0 && innerWidth < DESKTOP_MIN_WIDTH)
  const listMinSize = $derived(innerWidth < WIDE_MIN_WIDTH ? 40 : 20)

  const drawerTitle = $derived(
    isCreating ? 'New challenge' : (editor.challenge?.name ?? 'Challenge details')
  )

  let drawerDismissed = $state(false)
  const drawerOpen = $derived(isMobile && (selectedId !== null || isCreating) && !drawerDismissed)

  function handleSelect(challenge: AdminChallenge) {
    editor = select(editor, challenge)
    drawerDismissed = false
  }

  function handleCreateNew() {
    editor = create(editor)
    drawerDismissed = false
  }

  function handleDrawerOpenChange(open: boolean) {
    if (!open) {
      drawerDismissed = true
    }
  }

  function handleEditorChange(next: EditorState) {
    editor = next
  }
</script>

<svelte:window bind:innerWidth />

{#snippet listPane()}
  <admin-list-slot>
    <AdminChallengesList
      {challenges}
      {selectedId}
      isCreatingNew={isCreating}
      onSelect={handleSelect}
      onCreateNew={handleCreateNew}
    />
  </admin-list-slot>
{/snippet}

{#snippet detailPane()}
  <admin-detail-slot>
    <AdminChallengesDetails {editor} onEditorChange={handleEditorChange} />
  </admin-detail-slot>
{/snippet}

{#if isMobile}
  <admin-challenges-page data-form="mobile">
    <pane-surface data-side="list">{@render listPane()}</pane-surface>
    <Dialog
      open={drawerOpen}
      onOpenChange={handleDrawerOpenChange}
      title={drawerTitle}
      titleHidden
      presentation="drawer"
      flush
    >
      <drawer-body tabindex="-1">{@render detailPane()}</drawer-body>
    </Dialog>
  </admin-challenges-page>
{:else}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <admin-challenges-page data-form="desktop" onkeydown={handlePaneArrowKey}>
    <Splitter
      panels={[
        { id: 'list', minSize: listMinSize, maxSize: 50 },
        { id: 'detail', minSize: 40 },
      ]}
      defaultSize={[40, 60]}
    >
      {#snippet a()}
        <pane-surface data-side="list">{@render listPane()}</pane-surface>
      {/snippet}
      {#snippet b()}
        <pane-surface data-side="detail">{@render detailPane()}</pane-surface>
      {/snippet}
    </Splitter>
  </admin-challenges-page>
{/if}

<style>
  admin-challenges-page {
    display: flex;
    block-size: calc(100dvh - var(--header-height));
    min-block-size: 0;
    --splitter-handle-size: 0.5rem;

    &[data-form='mobile'] {
      flex-direction: column;

      pane-surface[data-side='list'] {
        flex: 1;
        min-block-size: 0;
        border-start-end-radius: 0;
      }
    }
  }

  pane-surface {
    display: flex;
    flex-direction: column;
    block-size: 100%;
    overflow: hidden;
    background: var(--background-l1);

    &[data-side='list'] {
      border-start-end-radius: var(--radius-3xl);
      border-end-end-radius: var(--radius-3xl);
    }

    &[data-side='detail'] {
      border-start-start-radius: var(--radius-3xl);
      border-end-start-radius: var(--radius-3xl);
    }
  }

  admin-list-slot,
  admin-detail-slot {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  drawer-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
    overflow: auto;
    overscroll-behavior: none;
  }

  :global([data-presentation='drawer']) {
    --dialog-drawer-max-size: 85dvh;
  }
</style>

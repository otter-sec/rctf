<!--
  PLACEHOLDER — replaced by U11 (form tabs, header actions, save/delete dialogs).

  This unit (U10) only builds the shell + list pane. The real detail pane owns
  the six-tab editor form and the save/delete plumbing; it is wired here against
  the committed editor-state module so U11 can drop in without touching the
  orchestrator. `editor` is the current EditorState; `onEditorChange` applies a
  transition produced by an editor-state reducer (edit/cancel/save/...).
-->
<script lang="ts">
  import IconFlag3Filled from '$lib/icons/icon-flag3-filled.svelte'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import type { EditorState } from './editor-state'

  interface Props {
    editor: EditorState
    onEditorChange: (next: EditorState) => void
  }

  // onEditorChange is unused by the placeholder; U11 dispatches transitions
  // through it (see the file header).
  let { editor }: Props = $props()

  const heading = $derived(
    editor.mode === 'creating' ? 'New Challenge' : (editor.challenge?.name ?? 'Untitled')
  )
</script>

<admin-challenges-details>
  {#if editor.mode === 'idle'}
    <EmptyState
      icon={IconFlag3Filled}
      title="Select a challenge"
      subtitle="Choose a challenge from the list to view or edit it."
    />
  {:else}
    <details-body>
      <h1>{heading}</h1>
      <p>The challenge editor form lands in a later unit (U11).</p>
    </details-body>
  {/if}
</admin-challenges-details>

<style>
  admin-challenges-details {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-block-size: 0;
    inline-size: 100%;
    padding: var(--space-l);
  }

  details-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    text-align: center;
  }

  h1 {
    margin: 0;
    font-size: var(--step-2);
    color: var(--foreground-l0);
  }

  p {
    margin: 0;
    color: var(--foreground-l4);
  }
</style>

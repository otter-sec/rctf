<!--
  PLACEHOLDER — the Files tab lands in U12.

  U12 replaces this with the drag-and-drop upload zone + file list. Expected
  prop contract: `{ files: EditorForm['files']; disabled: boolean; onChange:
  (files: EditorForm['files']) => void }` — the parent maps `onChange` onto the
  editor-state `updateFiles` transition.
-->
<script lang="ts">
  import IconFileFilled from '$lib/icons/icon-file-filled.svelte'
  import EmptyState from '$lib/ui/empty-state.svelte'
</script>

<placeholder-pane>
  <EmptyState
    icon={IconFileFilled}
    title="File attachments"
    subtitle="Upload and management land in a later unit (U12)."
  />
</placeholder-pane>

<style>
  placeholder-pane {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    min-block-size: 0;
    padding: var(--space-l);
  }
</style>

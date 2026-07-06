<script lang="ts">
  import Markdown from '$lib/components/markdown.svelte'
  import IconTrashFilled from '$lib/icons/icon-trash-filled.svelte'
  import Button from '$lib/ui/button.svelte'
  import Dialog from '$lib/ui/dialog.svelte'
  import Spinner from '$lib/ui/spinner.svelte'

  interface Props {
    unsavedOpen: boolean
    previewOpen: boolean
    deleteOpen: boolean
    description: string
    challengeName: string
    deleting: boolean
    onKeepEditing: () => void
    onDiscard: () => void
    onClosePreview: () => void
    onDeleteConfirm: () => void
    onDeleteCancel: () => void
  }

  let {
    unsavedOpen,
    previewOpen,
    deleteOpen,
    description,
    challengeName,
    deleting,
    onKeepEditing,
    onDiscard,
    onClosePreview,
    onDeleteConfirm,
    onDeleteCancel,
  }: Props = $props()
</script>

<Dialog
  open={unsavedOpen}
  onOpenChange={open => !open && onKeepEditing()}
  title="Unsaved changes"
  description="You have unsaved changes that will be lost. Are you sure you want to leave?"
>
  <dialog-footer>
    <Button variant="ghost" onclick={onKeepEditing}>Keep editing</Button>
    <Button variant="destructive" onclick={onDiscard}>Discard changes</Button>
  </dialog-footer>
</Dialog>

<Dialog
  open={previewOpen}
  onOpenChange={open => !open && onClosePreview()}
  title="Description preview"
  description="This is how the description will appear to players."
>
  <preview-body>
    {#if description}
      <Markdown content={description} />
    {:else}
      <p data-empty>No description to preview.</p>
    {/if}
  </preview-body>
</Dialog>

<Dialog
  open={deleteOpen}
  onOpenChange={open => !open && onDeleteCancel()}
  title="Delete challenge"
  description={`Are you sure you want to delete "${challengeName || 'this challenge'}"? This action cannot be undone.`}
>
  <dialog-footer>
    <Button variant="ghost" onclick={onDeleteCancel}>Cancel</Button>
    <Button variant="destructive" disabled={deleting} onclick={onDeleteConfirm}>
      {#if deleting}<Spinner />{/if}
      <IconTrashFilled />
      Delete challenge
    </Button>
  </dialog-footer>
</Dialog>

<style>
  dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2xs);
  }

  preview-body {
    display: block;
    max-block-size: 60vh;
    overflow-y: auto;

    p[data-empty] {
      margin: 0;
      padding-block: var(--space-l);
      color: var(--foreground-l3);
      text-align: center;
    }
  }
</style>

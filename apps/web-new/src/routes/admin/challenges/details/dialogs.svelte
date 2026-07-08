<script lang="ts">
  import { IconTrashFilled } from '$lib/icons'
  import Button from '$lib/ui/button.svelte'
  import Dialog from '$lib/ui/dialog.svelte'
  import Spinner from '$lib/ui/spinner.svelte'

  interface Props {
    unsavedOpen: boolean
    deleteOpen: boolean
    challengeName: string
    deleting: boolean
    onKeepEditing: () => void
    onDiscard: () => void
    onDeleteConfirm: () => void
    onDeleteCancel: () => void
  }

  let {
    unsavedOpen,
    deleteOpen,
    challengeName,
    deleting,
    onKeepEditing,
    onDiscard,
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
</style>

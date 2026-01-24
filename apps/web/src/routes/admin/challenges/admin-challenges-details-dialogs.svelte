<script lang="ts">
  import { Button, Dialog, Markdown, ScrollArea, Section, Spinner } from '$lib/components'
  import { IconAlertTriangleFilled, IconTrashFilled } from '$lib/icons'

  interface Props {
    showUnsavedDialog: boolean
    showPreviewDialog: boolean
    showDeleteDialog: boolean
    description: string
    challengeName: string
    isDeleting: boolean
    onDiscardChanges: () => void
    onCancelDiscard: () => void
    onClosePreview: () => void
    onDeleteConfirm: () => void
    onDeleteCancel: () => void
  }

  let {
    showUnsavedDialog,
    showPreviewDialog,
    showDeleteDialog,
    description,
    challengeName,
    isDeleting,
    onDiscardChanges,
    onCancelDiscard,
    onClosePreview,
    onDeleteConfirm,
    onDeleteCancel,
  }: Props = $props()
</script>

<Dialog.Root open={showUnsavedDialog} onOpenChange={open => !open && onCancelDiscard()}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <IconAlertTriangleFilled class="text-foreground-warning size-5" />
        Unsaved changes
      </Dialog.Title>
      <Dialog.Description>
        You have unsaved changes that will be lost. Are you sure you want to leave?
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer class="gap-2">
      <Button variant="ghost" onclick={onCancelDiscard}>Keep editing</Button>
      <Button variant="destructive" onclick={onDiscardChanges}>Discard changes</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root open={showPreviewDialog} onOpenChange={open => !open && onClosePreview()}>
  <Dialog.Content class="sm:max-w-2xl">
    <Dialog.Header>
      <Dialog.Title>Description preview</Dialog.Title>
      <Dialog.Description>This is how the description will appear to players.</Dialog.Description>
    </Dialog.Header>
    {#if description}
      <Section.Root>
        <Section.Header>Description</Section.Header>
        <Section.Content class="bg-background-l2 p-0">
          <ScrollArea class="h-[60vh]" fadeColor="background-l2">
            <div class="px-4 pt-2 pb-4">
              <Markdown content={description} class="prose-sm max-w-none" />
            </div>
          </ScrollArea>
        </Section.Content>
      </Section.Root>
    {:else}
      <p class="text-foreground-l3 py-8 text-center">No description to preview.</p>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root open={showDeleteDialog} onOpenChange={open => !open && onDeleteCancel()}>
  <Dialog.Content class="sm:max-w-md">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <IconTrashFilled class="text-foreground-destructive size-5" />
        Delete challenge
      </Dialog.Title>
      <Dialog.Description>
        Are you sure you want to delete "{challengeName || 'this challenge'}"? This action cannot be
        undone.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer class="gap-2">
      <Button variant="ghost" onclick={onDeleteCancel}>Cancel</Button>
      <Button variant="destructive" onclick={onDeleteConfirm}>
        {#if isDeleting}<Spinner class="size-4" />{/if}
        Delete challenge
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

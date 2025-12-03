<script lang="ts">
  import { Button, Spinner } from '$lib/components'
  import { IconPencilFilled, IconTrashFilled } from '$lib/icons'

  interface Props {
    isEditMode: boolean
    isCreatingNew: boolean
    hasWritePerms: boolean
    hasChallenge: boolean
    isUpdating: boolean
    isDeleting: boolean
    onEdit: () => void
    onCancel: () => void
    onSave: () => void
    onDelete: () => void
  }

  let {
    isEditMode,
    isCreatingNew,
    hasWritePerms,
    hasChallenge,
    isUpdating,
    isDeleting,
    onEdit,
    onCancel,
    onSave,
    onDelete,
  }: Props = $props()
</script>

<div class="flex items-center justify-between gap-4 bg-background-l1 px-5 py-4">
  {#if isEditMode || isCreatingNew}
    <div class="flex items-center gap-3">
      {#if !isCreatingNew && hasChallenge}
        <Button
          type="button"
          variant="destructive"
          size="lg"
          onclick={onDelete}
          disabled={isDeleting}
        >
          {#if isDeleting}
            <Spinner class="size-5" />
          {:else}
            <IconTrashFilled class="size-5" />
          {/if}
          Delete challenge
        </Button>
      {/if}
    </div>
    <div class="flex items-center gap-3">
      <Button type="button" variant="outline" size="lg" onclick={onCancel}>
        Cancel
      </Button>
      <Button type="button" size="lg" onclick={onSave} disabled={isUpdating}>
        {#if isUpdating}
          <Spinner class="size-5" />
        {/if}
        {isCreatingNew ? 'Create challenge' : 'Save changes'}
      </Button>
    </div>
  {:else if hasWritePerms}
    <div></div>
    <Button type="button" size="lg" onclick={onEdit}>
      <IconPencilFilled class="size-5" />
      Edit challenge
    </Button>
  {/if}
</div>

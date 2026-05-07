<script lang="ts">
  import { Button, Dialog, Spinner } from '$lib/components'

  interface Props {
    banDialogTeam: { id: string; name: string; banned: boolean } | null
    deleteDialogTeam: { id: string; name: string } | null
    updatingTeamId: string | null
    deletingTeamId: string | null
    onCloseBan: () => void
    onConfirmBan: () => void
    onCloseDelete: () => void
    onConfirmDelete: () => void
  }

  let {
    banDialogTeam,
    deleteDialogTeam,
    updatingTeamId,
    deletingTeamId,
    onCloseBan,
    onConfirmBan,
    onCloseDelete,
    onConfirmDelete,
  }: Props = $props()
</script>

<Dialog.Root open={banDialogTeam !== null} onOpenChange={open => !open && onCloseBan()}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>Ban team</Dialog.Title>
      <Dialog.Description>
        Are you sure you want to ban <span class="text-foreground-l1 font-medium"
          >{banDialogTeam?.name}</span
        >? This removes the team from the leaderboard but keeps their account and solve history.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="secondary" onclick={onCloseBan}>Cancel</Button>
      <Button
        variant="destructive"
        onclick={onConfirmBan}
        disabled={banDialogTeam ? updatingTeamId === banDialogTeam.id : false}
      >
        {#if banDialogTeam && updatingTeamId === banDialogTeam.id}
          <Spinner class="size-4" />
        {/if}
        Ban team
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root open={deleteDialogTeam !== null} onOpenChange={open => !open && onCloseDelete()}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>Delete team</Dialog.Title>
      <Dialog.Description>
        Are you sure you want to delete <span class="text-foreground-l1 font-medium"
          >{deleteDialogTeam?.name}</span
        >? This removes the team and its solves from the database.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="secondary" onclick={onCloseDelete}>Cancel</Button>
      <Button
        variant="destructive"
        onclick={onConfirmDelete}
        disabled={deleteDialogTeam ? deletingTeamId === deleteDialogTeam.id : false}
      >
        {#if deleteDialogTeam && deletingTeamId === deleteDialogTeam.id}
          <Spinner class="size-4" />
        {/if}
        Delete team
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

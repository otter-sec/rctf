<script lang="ts">
  import { Button, Dialog, ScrollArea, Spinner } from '$lib/components'
  import { IconTrashFilled, IconTrophyFilled } from '$lib/icons'
  import { formatLocalTime } from '$lib/utils'
  import {
    teamStatus,
    teamStatusLabel,
    type AdminTeam,
    type AdminTeamDetails,
    type AdminTeamSolve,
  } from './teams-model'

  interface Props {
    open: boolean
    selectedTeam?: AdminTeamDetails
    isPending: boolean
    errorMessage?: string
    hasWritePerms: boolean
    hasSolveWritePerms: boolean
    updatingTeamId: string | null
    deletingTeamId: string | null
    revokingSolveKey: string | null
    onClose: () => void
    onBanAction: (team: { id: string; name: string; banned: boolean }) => void
    onDeleteTeam: (team: { id: string; name: string }) => void
    onRevokeSolve: (solve: { challengeId: string; challengeName: string }) => void
  }

  let {
    open,
    selectedTeam,
    isPending,
    errorMessage,
    hasWritePerms,
    hasSolveWritePerms,
    updatingTeamId,
    deletingTeamId,
    revokingSolveKey,
    onClose,
    onBanAction,
    onDeleteTeam,
    onRevokeSolve,
  }: Props = $props()
</script>

<Dialog.Root {open} onOpenChange={nextOpen => !nextOpen && onClose()}>
  <Dialog.Content class="flex max-h-[min(720px,calc(100dvh-48px))] max-w-2xl flex-col">
    <Dialog.Header>
      <Dialog.Title>{selectedTeam?.name ?? 'Team'}</Dialog.Title>
      <Dialog.Description>
        {#if selectedTeam}
          {selectedTeam.email ?? 'No email'} - Registered {formatLocalTime(
            new Date(selectedTeam.createdAt).getTime()
          )}
        {:else}
          Loading team details
        {/if}
      </Dialog.Description>
    </Dialog.Header>

    {#if isPending}
      <div class="flex min-h-48 items-center justify-center">
        <Spinner class="size-6" />
      </div>
    {:else if errorMessage}
      <div class="text-foreground-l3 py-8 text-center">
        {errorMessage}
      </div>
    {:else if selectedTeam}
      <div class="grid gap-2 sm:grid-cols-3">
        <div class="bg-background-l2 rounded-lg p-3">
          <div class="text-foreground-l3 text-sm">Score</div>
          <div class="text-foreground-l1 text-xl tabular-nums">
            {selectedTeam.score.toLocaleString()}
          </div>
        </div>
        <div class="bg-background-l2 rounded-lg p-3">
          <div class="text-foreground-l3 text-sm">Solves</div>
          <div class="text-foreground-l1 text-xl tabular-nums">
            {selectedTeam.solveCount}
          </div>
        </div>
        <div class="bg-background-l2 rounded-lg p-3">
          <div class="text-foreground-l3 text-sm">Status</div>
          <div class="text-foreground-l1 text-xl">
            {teamStatusLabel(teamStatus(selectedTeam))}
          </div>
        </div>
      </div>

      <div class="mt-4 min-h-0 flex-1">
        <div class="text-foreground-l1 mb-2 flex items-center gap-2 text-sm font-medium">
          <IconTrophyFilled class="size-4" />
          Solves
        </div>

        {#if selectedTeam.solves.length === 0}
          <div class="bg-background-l2 text-foreground-l3 rounded-lg py-10 text-center">
            No solves yet
          </div>
        {:else}
          <ScrollArea class="max-h-80" fadeSize={48} fadeColor="background-l1">
            <div class="flex flex-col gap-2 pr-3">
              {#each selectedTeam.solves as solve (solve.challengeId)}
                {@const revokeKey = `${selectedTeam.id}:${solve.challengeId}`}
                <div class="bg-background-l2 flex items-center gap-3 rounded-lg p-3">
                  <div class="min-w-0 flex-1">
                    <div class="text-foreground-l1 truncate text-sm font-medium">
                      {solve.challengeName}
                    </div>
                    <div class="text-foreground-l3 truncate text-sm">
                      {solve.challengeCategory} - {formatLocalTime(
                        new Date(solve.createdAt).getTime()
                      )}
                    </div>
                  </div>
                  {#if hasSolveWritePerms}
                    <Button
                      variant="destructive"
                      size="sm"
                      onclick={() => onRevokeSolve(solve)}
                      disabled={revokingSolveKey === revokeKey}
                    >
                      {#if revokingSolveKey === revokeKey}
                        <Spinner class="size-4" />
                      {:else}
                        <IconTrashFilled class="size-4" />
                      {/if}
                      Revoke
                    </Button>
                  {/if}
                </div>
              {/each}
            </div>
          </ScrollArea>
        {/if}
      </div>

      <Dialog.Footer>
        <Button variant="secondary" onclick={onClose}>Close</Button>
        {#if hasWritePerms && selectedTeam.perms === 0}
          <Button
            variant={selectedTeam.banned ? 'secondary' : 'destructive'}
            onclick={() => onBanAction(selectedTeam)}
            disabled={updatingTeamId === selectedTeam.id}
          >
            {#if updatingTeamId === selectedTeam.id}
              <Spinner class="size-4" />
            {/if}
            {selectedTeam.banned ? 'Unban team' : 'Ban team'}
          </Button>
          <Button
            variant="destructive"
            onclick={() => onDeleteTeam(selectedTeam)}
            disabled={deletingTeamId === selectedTeam.id}
          >
            {#if deletingTeamId === selectedTeam.id}
              <Spinner class="size-4" />
            {/if}
            Delete team
          </Button>
        {/if}
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>

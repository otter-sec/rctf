<script lang="ts">
  import { GoodAdminUserDeleteV2, GoodAdminUserUpdateV2, GoodCreateUserTokenV2 } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { showApiError } from '$lib/api'
  import { Button, Dialog, Section, Spinner } from '$lib/components'
  import { IconFilter, IconKeyFilled, IconLogin, IconMoodX, IconTrashFilled } from '$lib/icons'
  import {
    useCreateUserTokenMutation,
    useDeleteAdminUserMutation,
    useUpdateAdminUserMutation,
  } from '$lib/query'
  import { toast } from 'svelte-sonner'
  import type { AdminTeamDetails } from '../../teams/teams-model'
  import { invalidateAdminTeamQueries } from './admin-profile-queries'

  interface Props {
    id: string
    team: AdminTeamDetails
  }

  let { id, team }: Props = $props()

  const queryClient = useQueryClient()
  const updateMutation = useUpdateAdminUserMutation()
  const deleteMutation = useDeleteAdminUserMutation()
  const tokenMutation = useCreateUserTokenMutation()

  let banDialogOpen = $state(false)
  let deleteDialogOpen = $state(false)
  let copyingToken = $state(false)
  let copyingUrl = $state(false)

  const updating = $derived(updateMutation.isPending)
  const deleting = $derived(deleteMutation.isPending)

  const refresh = () =>
    invalidateAdminTeamQueries(queryClient, { teamId: id, affectsScoring: true })

  function toggleBan(banned: boolean) {
    updateMutation.mutate(
      { id, data: { banned } },
      {
        onSuccess: response => {
          if (response.kind === GoodAdminUserUpdateV2.kind) {
            toast.success(banned ? `${team.name} banned` : `${team.name} unbanned`)
            refresh()
            banDialogOpen = false
          } else {
            showApiError(response)
          }
        },
        onError: error => toast.error(error.message),
      }
    )
  }

  function handleBanClick() {
    if (team.banned) {
      toggleBan(false)
    } else {
      banDialogOpen = true
    }
  }

  function confirmDelete() {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: response => {
          if (response.kind === GoodAdminUserDeleteV2.kind) {
            toast.success(`${team.name} deleted`)
            invalidateAdminTeamQueries(queryClient, { affectsScoring: true })
            goto('/admin/teams')
          } else {
            showApiError(response)
          }
        },
        onError: error => toast.error(error.message),
      }
    )
  }

  function copyToken(asUrl: boolean) {
    if (asUrl) {
      copyingUrl = true
    } else {
      copyingToken = true
    }
    tokenMutation.mutate(
      { id },
      {
        onSuccess: async response => {
          if (response.kind === GoodCreateUserTokenV2.kind) {
            const value = asUrl
              ? `${location.origin}/login?token=${encodeURIComponent(response.data.token)}`
              : response.data.token
            try {
              await navigator.clipboard.writeText(value)
              toast.success(asUrl ? 'Login URL copied' : 'Login token copied')
            } catch {
              toast.error('Failed to copy to clipboard')
            }
          } else {
            showApiError(response)
          }
          copyingToken = false
          copyingUrl = false
        },
        onError: error => {
          toast.error(error.message)
          copyingToken = false
          copyingUrl = false
        },
      }
    )
  }
</script>

<Section.Root>
  <Section.Header>Manage</Section.Header>
  <Section.Content>
    <div class="flex flex-wrap gap-2">
      <Button variant="secondary" onclick={() => copyToken(false)} disabled={copyingToken}>
        {#if copyingToken}
          <Spinner class="size-4" />
        {:else}
          <IconKeyFilled class="size-4" />
        {/if}
        Copy login token
      </Button>
      <Button variant="secondary" onclick={() => copyToken(true)} disabled={copyingUrl}>
        {#if copyingUrl}
          <Spinner class="size-4" />
        {:else}
          <IconLogin class="size-4" />
        {/if}
        Copy login URL
      </Button>
      <Button variant="secondary" onclick={() => goto(`/admin/submissions?team=${id}`)}>
        <IconFilter class="size-4" />
        View submissions
      </Button>
      <Button
        variant={team.banned ? 'secondary' : 'destructive'}
        onclick={handleBanClick}
        disabled={updating}
      >
        {#if updating}
          <Spinner class="size-4" />
        {:else}
          <IconMoodX class="size-4" />
        {/if}
        {team.banned ? 'Unban team' : 'Ban team'}
      </Button>
      <Button variant="destructive" onclick={() => (deleteDialogOpen = true)} disabled={deleting}>
        {#if deleting}
          <Spinner class="size-4" />
        {:else}
          <IconTrashFilled class="size-4" />
        {/if}
        Delete team
      </Button>
    </div>
  </Section.Content>
</Section.Root>

<Dialog.Root open={banDialogOpen} onOpenChange={open => (banDialogOpen = open)}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>Ban team</Dialog.Title>
      <Dialog.Description>
        Are you sure you want to ban
        <span class="text-foreground-l1 font-medium">{team.name}</span>? This removes the team from
        the leaderboard but keeps their account and solve history.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="secondary" onclick={() => (banDialogOpen = false)}>Cancel</Button>
      <Button variant="destructive" onclick={() => toggleBan(true)} disabled={updating}>
        {#if updating}
          <Spinner class="size-4" />
        {/if}
        Ban team
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root open={deleteDialogOpen} onOpenChange={open => (deleteDialogOpen = open)}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>Delete team</Dialog.Title>
      <Dialog.Description>
        Are you sure you want to delete
        <span class="text-foreground-l1 font-medium">{team.name}</span>? This removes the team and
        its solves from the database.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="secondary" onclick={() => (deleteDialogOpen = false)}>Cancel</Button>
      <Button variant="destructive" onclick={confirmDelete} disabled={deleting}>
        {#if deleting}
          <Spinner class="size-4" />
        {/if}
        Delete team
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

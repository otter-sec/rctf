<script lang="ts">
  import { GoodMemberCreate, GoodMemberDelete } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { toast } from '$lib'
  import { Badge, Button, Card, Field, Input, Spinner } from '$lib/components'
  import { IconTrashFilled, IconUsersPlus } from '$lib/icons'
  import {
    queryKeys,
    useCreateMemberMutation,
    useDeleteMemberMutation,
    useMembers,
  } from '$lib/query'

  const queryClient = useQueryClient()
  const membersQuery = useMembers()
  const createMutation = useCreateMemberMutation()
  const deleteMutation = useDeleteMemberMutation()

  let newEmail = $state('')
  let errors = $state<Record<string, string>>({})
  let deletingId = $state<string | null>(null)

  const members = $derived($membersQuery.data ?? [])

  async function handleAddMember(e: SubmitEvent) {
    e.preventDefault()

    if (!newEmail.trim()) {
      errors = { email: 'Please enter an email address' }
      return
    }

    errors = {}

    $createMutation.mutate(
      { email: newEmail.trim() },
      {
        onSuccess: response => {
          if (response.kind === GoodMemberCreate.kind) {
            newEmail = ''
            toast.success('Team member added successfully!')
            queryClient.invalidateQueries({ queryKey: queryKeys.members })
          } else {
            errors = { email: response.message }
          }
        },
        onError: error => {
          errors = { email: error.message }
        },
      }
    )
  }

  async function handleDeleteMember(id: string) {
    deletingId = id

    $deleteMutation.mutate(
      { id },
      {
        onSuccess: response => {
          if (response.kind === GoodMemberDelete.kind) {
            toast.success('Team member removed successfully!')
            queryClient.invalidateQueries({ queryKey: queryKeys.members })
          } else {
            toast.error(response.message)
          }
          deletingId = null
        },
        onError: error => {
          toast.error(error.message)
          deletingId = null
        },
      }
    )
  }
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>
      Team members
      <Badge variant="secondary" class="ml-2">{members.length}</Badge>
    </Card.Title>
    <Card.Description>
      Add your team members' emails for informational purposes. Keep this
      updated to remain prize eligible.
    </Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-4">
    <form onsubmit={handleAddMember} class="flex gap-2">
      <Field.Field class="flex-1" data-invalid={!!errors.email || undefined}>
        <div class="flex gap-2">
          <Input
            id="memberEmail"
            name="email"
            type="email"
            placeholder="teammate@example.com"
            autocomplete="email"
            required
            bind:value={newEmail}
            disabled={$createMutation.isPending}
            aria-invalid={!!errors.email}
            class="flex-1"
          />
          <Button
            type="submit"
            disabled={$createMutation.isPending}
            size="icon"
          >
            {#if $createMutation.isPending}
              <Spinner class="size-4" />
            {:else}
              <IconUsersPlus class="size-4" />
            {/if}
          </Button>
        </div>
        {#if errors.email}
          <Field.Error>{errors.email}</Field.Error>
        {/if}
      </Field.Field>
    </form>

    {#if $membersQuery.isPending}
      <div class="flex items-center justify-center py-4">
        <Spinner class="size-6" />
      </div>
    {:else if members.length > 0}
      <ul class="flex flex-col gap-2">
        {#each members as member (member.id)}
          <li
            class="flex items-center justify-between gap-2 rounded-md border p-3"
          >
            <span class="truncate text-sm">{member.email}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              onclick={() => handleDeleteMember(member.id)}
              disabled={deletingId === member.id}
              aria-label="Remove team member"
            >
              {#if deletingId === member.id}
                <Spinner class="size-4" />
              {:else}
                <IconTrashFilled class="text-foreground-destructive size-4" />
              {/if}
            </Button>
          </li>
        {/each}
      </ul>
    {:else}
      <p class="text-foreground-l3 text-sm">
        No team members added yet. Add your teammates' emails above.
      </p>
    {/if}
  </Card.Content>
</Card.Root>

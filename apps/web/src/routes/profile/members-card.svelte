<script lang="ts">
  import { IconTrash, IconUsersPlus } from '$lib/icons'
  import {
    CreateMemberRoute,
    DeleteMemberRoute,
    GetMembersRoute,
    GoodMemberCreate,
    GoodMemberData,
    GoodMemberDelete,
  } from '@rctf/types'
  import { apiRequest, toast } from '$lib'
  import { Badge, Button, Card, Field, Input, Spinner } from '$lib/components'
  import { onMount } from 'svelte'

  type Member = {
    id: string
    userid: string
    email: string
  }

  let members = $state<Member[]>([])
  let newEmail = $state('')
  let loading = $state(false)
  let loadingMembers = $state(true)
  let deletingId = $state<string | null>(null)
  let errors = $state<Record<string, string>>({})

  onMount(() => {
    loadMembers()
  })

  async function loadMembers() {
    loadingMembers = true
    const response = await apiRequest(GetMembersRoute)

    if (response.kind === GoodMemberData.kind) {
      members = response.data
    } else {
      toast.error(response.message)
    }

    loadingMembers = false
  }

  async function handleAddMember(e: SubmitEvent) {
    e.preventDefault()

    if (!newEmail.trim()) {
      errors = { email: 'Please enter an email address' }
      return
    }

    loading = true
    errors = {}

    const response = await apiRequest(CreateMemberRoute, {
      email: newEmail.trim(),
    })

    if (response.kind === GoodMemberCreate.kind) {
      members = [...members, response.data]
      newEmail = ''
      toast.success('Team member added successfully!')
    } else {
      errors = { email: response.message }
    }

    loading = false
  }

  async function handleDeleteMember(id: string) {
    deletingId = id

    const response = await apiRequest(DeleteMemberRoute, { id })

    if (response.kind === GoodMemberDelete.kind) {
      members = members.filter(m => m.id !== id)
      toast.success('Team member removed successfully!')
    } else {
      toast.error(response.message)
    }

    deletingId = null
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
            disabled={loading}
            aria-invalid={!!errors.email}
            class="flex-1"
          />
          <Button type="submit" disabled={loading} size="icon">
            {#if loading}
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

    {#if loadingMembers}
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
                <IconTrash class="text-foreground-destructive size-4" />
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

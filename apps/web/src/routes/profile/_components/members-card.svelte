<script lang="ts">
  import { GoodMemberCreate, GoodMemberDelete } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { toast } from '$lib'
  import { Badge, Field, Section, Spinner } from '$lib/components'
  import { TagInput } from '$lib/components/ui/tag-input'
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

  let error = $state<string | null>(null)

  const members = $derived($membersQuery.data ?? [])
  const memberEmails = $derived(members.map(m => m.email))

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  function validateEmail(email: string): boolean {
    return EMAIL_REGEX.test(email.trim())
  }

  function handleEmailsChange(newEmails: string[]) {
    error = null

    const added = newEmails.find(e => !memberEmails.includes(e))
    if (added) {
      handleAddMember(added)
      return
    }

    const removed = memberEmails.find(e => !newEmails.includes(e))
    if (removed) {
      const member = members.find(m => m.email === removed)
      if (member) handleDeleteMember(member.id)
    }
  }

  function handleAddMember(email: string) {
    $createMutation.mutate(
      { email: email.trim() },
      {
        onSuccess: response => {
          if (response.kind === GoodMemberCreate.kind) {
            toast.success('Team member added successfully!')
            queryClient.invalidateQueries({ queryKey: queryKeys.members })
          } else {
            error = response.message
          }
        },
        onError: err => {
          error = err.message
        },
      }
    )
  }

  function handleDeleteMember(id: string) {
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
        },
        onError: err => {
          toast.error(err.message)
        },
      }
    )
  }
</script>

<Section.Root>
  <Section.Header class="flex items-center justify-between">
    <span>Team members</span>
    <Badge variant="secondary">{members.length}</Badge>
  </Section.Header>
  <Section.Content class="flex flex-col gap-3">
    {#if $membersQuery.isPending}
      <div class="flex items-center justify-center py-3">
        <Spinner class="size-5" />
      </div>
    {:else}
      <Field.Field data-invalid={!!error || undefined}>
        <TagInput
          value={memberEmails}
          onchange={handleEmailsChange}
          validate={validateEmail}
          class="[&>span]:font-sans"
          disabled={$createMutation.isPending || $deleteMutation.isPending}
          placeholder="Add more..."
          emptyPlaceholder="teammate@example.com" />
        {#if error}
          <Field.Error>{error}</Field.Error>
        {/if}
      </Field.Field>
    {/if}
  </Section.Content>
</Section.Root>

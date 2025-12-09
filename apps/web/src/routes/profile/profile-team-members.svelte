<script lang="ts">
  import { CreateMemberRoute, DeleteMemberRoute, GoodMemberDelete } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { toast } from '$lib'
  import { apiRequest } from '$lib/api'
  import { Badge, Field, Section, Spinner } from '$lib/components'
  import { TagInput } from '$lib/components/ui/tag-input'
  import { useApiForm } from '$lib/forms'
  import { queryKeys, useMembers } from '$lib/query'

  const queryClient = useQueryClient()
  const membersQuery = useMembers()

  const members = $derived($membersQuery.data ?? [])
  const memberEmails = $derived(members.map(m => m.email))

  const invalidateMembers = () => queryClient.invalidateQueries({ queryKey: queryKeys.members })

  const memberForm = useApiForm(CreateMemberRoute, {
    onSuccess: () => {
      toast.success('Team member added!')
      invalidateMembers()
      memberForm.reset()
    },
  })

  let deleting = $state<string | null>(null)

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  function validateEmail(email: string): boolean {
    return EMAIL_REGEX.test(email.trim())
  }

  async function deleteMember(id: string) {
    deleting = id
    const res = await apiRequest(DeleteMemberRoute, { id })
    if (res.kind === GoodMemberDelete.kind) {
      toast.success('Team member removed!')
      invalidateMembers()
    } else {
      toast.error(res.message)
    }
    deleting = null
  }

  function handleEmailsChange(newEmails: string[]) {
    memberForm.clearErrors()

    const added = newEmails.find(e => !memberEmails.includes(e))
    if (added) {
      memberForm.setData({ email: added.trim() })
      memberForm.submit()
      return
    }

    const removed = memberEmails.find(e => !newEmails.includes(e))
    if (removed) {
      const member = members.find(m => m.email === removed)
      if (member) deleteMember(member.id)
    }
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
      <Field.Field data-invalid={!!memberForm.errors._form || undefined}>
        <TagInput
          value={memberEmails}
          onchange={handleEmailsChange}
          validate={validateEmail}
          class="[&>span]:font-sans"
          disabled={memberForm.submitting || deleting !== null}
          placeholder="Add more..."
          emptyPlaceholder="teammate@example.com"
        />
        {#if memberForm.errors._form}
          <Field.Error>{memberForm.errors._form}</Field.Error>
        {/if}
      </Field.Field>
    {/if}
  </Section.Content>
</Section.Root>

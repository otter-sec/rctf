<script lang="ts">
  import {
    CreateMemberRoute,
    DeleteMemberRoute,
    GoodMemberDelete,
    type ClientConfig,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { apiRequest, showApiError } from '$lib/api'
  import { useApiForm } from '$lib/forms/use-api-form.svelte'
  import { queryKeys } from '$lib/query/keys'
  import { useMembers } from '$lib/query/user'
  import { toast } from '$lib/toast'
  import Section from '$lib/ui/section.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import TagInput from '$lib/ui/tag-input.svelte'
  import { createAsyncAction } from '$lib/utils/async-action.svelte'
  import { diffMemberChange, isValidEmail } from './members-logic'

  type Props = {
    clientConfig: ClientConfig
  }

  let { clientConfig }: Props = $props()

  const queryClient = useQueryClient()
  const membersQuery = useMembers(() => clientConfig.userMembers)

  const members = $derived(membersQuery.data ?? [])
  const memberEmails = $derived(members.map(member => member.email))

  const deleteAction = createAsyncAction<string>()

  function invalidateMembers() {
    queryClient.invalidateQueries({ queryKey: queryKeys.members })
  }

  const memberForm = useApiForm(CreateMemberRoute, {
    onSuccess: () => {
      toast.success('Team member added!')
      invalidateMembers()
      memberForm.reset()
    },
  })

  async function deleteMember(id: string) {
    await deleteAction.run(
      async () => {
        const response = await apiRequest(DeleteMemberRoute, { id })
        if (response.kind === GoodMemberDelete.kind) {
          toast.success('Team member removed!')
          invalidateMembers()
        } else {
          showApiError(response)
        }
      },
      { key: id, errorMessage: 'Failed to remove team member' }
    )
  }

  function handleChange(next: string[]) {
    memberForm.clearErrors()
    const change = diffMemberChange(memberEmails, next, members)
    if (change.kind === 'add') {
      memberForm.setData({ email: change.email })
      memberForm.submit()
    } else if (change.kind === 'remove') {
      deleteMember(change.id)
    }
  }
</script>

{#if clientConfig.userMembers}
  <Section title="Team members">
    <members-settings>
      {#if membersQuery.isPending}
        <members-loading><Spinner /></members-loading>
      {:else}
        <members-count>{members.length}</members-count>
        <members-field data-invalid={!!memberForm.errors._form || undefined}>
          <TagInput
            value={memberEmails}
            onchange={handleChange}
            validate={isValidEmail}
            disabled={memberForm.submitting || deleteAction.pending}
            aria-label="Add team member email"
            placeholder="Add more..."
            emptyPlaceholder="teammate@example.com"
          />
          {#if memberForm.errors._form}
            <members-error role="alert">{memberForm.errors._form}</members-error
            >
          {/if}
        </members-field>
      {/if}
    </members-settings>
  </Section>
{/if}

<style>
  members-settings {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
  }

  members-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2xs);
  }

  members-count {
    align-self: flex-end;
    min-inline-size: 1.5rem;
    padding: 0.0625rem 0.375rem;
    color: var(--foreground-l3);
    font-size: var(--step--2);
    font-variant-numeric: tabular-nums;
    text-align: center;
    background: var(--background-l2);
    border-radius: var(--radius-sm);
  }

  members-field {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
  }

  members-error {
    display: block;
    color: var(--foreground-destructive);
    font-size: var(--step--1);
  }
</style>

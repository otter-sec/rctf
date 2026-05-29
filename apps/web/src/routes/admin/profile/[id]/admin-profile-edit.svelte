<script lang="ts">
  import type { ClientConfig } from '@rctf/types'
  import { GoodAdminUserUpdateV2 } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { showApiError } from '$lib/api'
  import { Button, Field, FlagPicker, Input, Section, Select, Spinner } from '$lib/components'
  import { useUpdateAdminUserMutation } from '$lib/query'
  import { untrack } from 'svelte'
  import { toast } from 'svelte-sonner'
  import type { AdminTeamDetails } from '../../teams/teams-model'
  import { invalidateAdminTeamQueries } from './admin-profile-queries'

  interface Props {
    id: string
    team: AdminTeamDetails
    clientConfig: ClientConfig
  }

  let { id, team, clientConfig }: Props = $props()

  const queryClient = useQueryClient()
  const mutation = useUpdateAdminUserMutation()
  const loading = $derived(mutation.isPending)

  // Seed editable draft state once; the parent remounts this form per team
  // (keyed on team id), so untrack avoids re-capturing on unrelated refetches.
  let name = $state(untrack(() => team.name))
  let division = $state(untrack(() => team.division))
  let countryCode = $state<string | null>(untrack(() => team.countryCode))
  let statusText = $state<string | null>(untrack(() => team.statusText))

  const divisionOptions = $derived(
    Object.entries(clientConfig.divisions).map(([value, label]) => ({ value, label }))
  )
  const selectedDivisionLabel = $derived(clientConfig.divisions[division] ?? 'Select division')

  const hasChanges = $derived(
    name !== team.name ||
      division !== team.division ||
      (countryCode ?? null) !== (team.countryCode ?? null) ||
      (statusText ?? null) !== (team.statusText ?? null)
  )

  function submit(e: Event) {
    e.preventDefault()
    mutation.mutate(
      {
        id,
        data: { name, division, countryCode, statusText },
      },
      {
        onSuccess: response => {
          if (response.kind === GoodAdminUserUpdateV2.kind) {
            toast.success('Profile updated!')
            invalidateAdminTeamQueries(queryClient, { teamId: id, affectsListing: true })
          } else {
            showApiError(response)
          }
        },
        onError: error => toast.error(error.message),
      }
    )
  }
</script>

<Section.Root>
  <Section.Header>Edit profile</Section.Header>
  <Section.Content>
    <form onsubmit={submit} class="flex flex-col gap-3">
      <Field.Field>
        <Field.Label>Team name</Field.Label>
        <Input
          type="text"
          placeholder="Team name"
          minlength={2}
          maxlength={64}
          required
          bind:value={name}
          disabled={loading}
        />
      </Field.Field>

      {#if divisionOptions.length > 1}
        <Field.Field>
          <Field.Label>Division</Field.Label>
          <Select.Root type="single" bind:value={division} disabled={loading}>
            <Select.Trigger class="w-full">{selectedDivisionLabel}</Select.Trigger>
            <Select.Content>
              {#each divisionOptions as option (option.value)}
                <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </Field.Field>
      {/if}

      <Field.Field>
        <Field.Label>Country</Field.Label>
        <FlagPicker
          bind:value={countryCode}
          disabled={loading}
          class="bg-background-l4 hover:bg-background-l5"
        />
      </Field.Field>

      <Field.Field>
        <Field.Label>
          Status
          <Field.Hint>(max 60 characters)</Field.Hint>
        </Field.Label>
        <Input
          type="text"
          placeholder="Status message"
          maxlength={60}
          bind:value={statusText}
          disabled={loading}
        />
      </Field.Field>

      <Button type="submit" disabled={loading || !hasChanges} class="w-full">
        {#if loading}
          <Spinner class="size-4" />
        {/if}
        Save profile
      </Button>
    </form>
  </Section.Content>
</Section.Root>

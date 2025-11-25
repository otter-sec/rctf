<script lang="ts">
  import {
    DeleteEmailRoute,
    GoodEmailRemoved,
    GoodEmailSet,
    GoodUserUpdate,
    GoodVerifySent,
    SetEmailRoute,
    UpdateUserRoute,
  } from '@rctf/types'
  import { invalidateAll } from '$app/navigation'
  import { apiRequest, toast, type ClientConfig, type UserProfile } from '$lib'
  import { Button, Card, Field, Input, Select, Spinner } from '$lib/components'

  let {
    user,
    clientConfig,
  }: { user: UserProfile; clientConfig: ClientConfig } = $props()

  let name = $state(user.name)
  let email = $state(user.email ?? '')
  let division = $state(user.division)
  let loading = $state(false)
  let errors = $state<Record<string, string>>({})

  const divisionOptions = $derived(
    Object.entries(clientConfig.divisions).map(([value, label]) => ({
      value,
      label,
    }))
  )

  const allowedDivisionOptions = $derived(
    divisionOptions.filter(d => user.allowedDivisions.includes(d.value))
  )

  const selectedDivisionLabel = $derived(
    clientConfig.divisions[division] ?? 'Select division'
  )

  const canDeleteEmail = $derived(clientConfig.emailEnabled && user.email)

  const hasChanges = $derived(
    name !== user.name ||
      email !== (user.email ?? '') ||
      division !== user.division
  )

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()

    if (!hasChanges) {
      toast.info('No changes to save')
      return
    }

    loading = true
    errors = {}

    let updated = false

    if (name !== user.name || division !== user.division) {
      const response = await apiRequest(UpdateUserRoute, {
        name: name !== user.name ? name : undefined,
        division: division !== user.division ? division : undefined,
      })

      if (response.kind === GoodUserUpdate.kind) {
        toast.success('Profile updated successfully!')
        updated = true
      } else {
        const msg = response.message
        if (msg.toLowerCase().includes('name')) {
          errors = { ...errors, name: msg }
        } else if (msg.toLowerCase().includes('division')) {
          errors = { ...errors, division: msg }
        } else {
          errors = { ...errors, form: msg }
        }
      }
    }

    if (email !== (user.email ?? '')) {
      if (email === '' && canDeleteEmail) {
        const response = await apiRequest(DeleteEmailRoute)
        if (response.kind === GoodEmailRemoved.kind) {
          toast.success('Email removed successfully!')
          updated = true
        } else {
          errors = { ...errors, email: response.message }
        }
      } else if (email !== '') {
        const response = await apiRequest(SetEmailRoute, { email })
        if (response.kind === GoodEmailSet.kind) {
          toast.success('Email updated successfully!')
          updated = true
        } else if (response.kind === GoodVerifySent.kind) {
          toast.success('Verification email sent. Please check your inbox.')
          updated = true
        } else {
          errors = { ...errors, email: response.message }
        }
      }
    }

    if (updated) {
      await invalidateAll()
    }

    loading = false
  }
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Update profile</Card.Title>
    <Card.Description>
      Update your team's name, email, or division. Name changes are limited to
      once every 10 minutes.
    </Card.Description>
  </Card.Header>
  <Card.Content>
    {#if errors.form}
      <div
        class="bg-background-destructive text-foreground-destructive mb-4 rounded-md p-3 text-sm"
        role="alert"
      >
        {errors.form}
      </div>
    {/if}

    <form onsubmit={handleSubmit} class="flex flex-col gap-4">
      <Field.Field data-invalid={!!errors.name || undefined}>
        <Field.Label for="name">Team name</Field.Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Enter your team name"
          autocomplete="username"
          autocorrect="off"
          minlength={2}
          maxlength={64}
          required
          bind:value={name}
          aria-invalid={!!errors.name}
        />
        {#if errors.name}
          <Field.Error>{errors.name}</Field.Error>
        {/if}
      </Field.Field>

      <Field.Field data-invalid={!!errors.email || undefined}>
        <Field.Label for="email"
          >Email{canDeleteEmail ? ' (optional)' : ''}</Field.Label
        >
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email"
          autocomplete="email"
          bind:value={email}
          aria-invalid={!!errors.email}
        />
        <Field.Description>
          {#if canDeleteEmail}
            Used for account recovery. Leave blank to remove.
          {:else}
            Used for account recovery.
          {/if}
        </Field.Description>
        {#if errors.email}
          <Field.Error>{errors.email}</Field.Error>
        {/if}
      </Field.Field>

      {#if allowedDivisionOptions.length > 1}
        <Field.Field data-invalid={!!errors.division || undefined}>
          <Field.Label>Division</Field.Label>
          <Select.Root type="single" bind:value={division}>
            <Select.Trigger class="w-full">
              {selectedDivisionLabel}
            </Select.Trigger>
            <Select.Content>
              {#each allowedDivisionOptions as option (option.value)}
                <Select.Item value={option.value} label={option.label}>
                  {option.label}
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
          {#if errors.division}
            <Field.Error>{errors.division}</Field.Error>
          {/if}
        </Field.Field>
      {/if}

      <Button type="submit" disabled={loading || !hasChanges} class="w-full">
        {#if loading}
          <Spinner class="size-4" />
        {/if}
        Save changes
      </Button>
    </form>
  </Card.Content>
</Card.Root>

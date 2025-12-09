<script lang="ts">
  import {
    DeleteEmailRoute,
    GoodEmailRemoved,
    ProtectedAction,
    SetEmailRouteV2,
    UpdateUserRouteV2,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { toast } from '$lib'
  import { apiRequest } from '$lib/api'
  import { Button, Field, Input, Section, Select, Spinner } from '$lib/components'
  import CaptchaNotice from '$lib/components/captcha-notice.svelte'
  import { useApiForm } from '$lib/forms'
  import { queryKeys, useClientConfig, useCurrentUser } from '$lib/query'

  const queryClient = useQueryClient()
  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()

  const user = $derived($userQuery.data)
  const clientConfig = $derived($clientConfigQuery.data)

  const invalidateUser = () => queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })

  const profileForm = useApiForm(UpdateUserRouteV2, {
    onSuccess: () => {
      toast.success('Profile updated!')
      invalidateUser()
    },
  })

  const emailForm = useApiForm(SetEmailRouteV2, {
    onSuccess: () => {
      toast.success('Email updated!')
      invalidateUser()
    },
  })

  let initialized = $state(false)
  let deletingEmail = $state(false)

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const isEmailValid = $derived(
    (emailForm.data.email ?? '') === '' || EMAIL_REGEX.test((emailForm.data.email ?? '').trim())
  )

  $effect(() => {
    if (user && !initialized) {
      profileForm.setData({ name: user.name, division: user.division })
      emailForm.setData({ email: user.email ?? '' })
      initialized = true
    }
  })

  const divisionOptions = $derived(
    clientConfig
      ? Object.entries(clientConfig.divisions).map(([value, label]) => ({
          value,
          label,
        }))
      : []
  )

  const allowedDivisionOptions = $derived(
    user ? divisionOptions.filter(d => user.allowedDivisions.includes(d.value)) : []
  )

  const selectedDivisionLabel = $derived(
    clientConfig?.divisions[profileForm.data.division ?? ''] ?? 'Select division'
  )

  // Can only delete email if user has an alternative auth method (linked CTFtime)
  const canDeleteEmail = $derived(clientConfig?.emailEnabled && user?.email && user?.ctftimeId)

  const profileHasChanges = $derived(
    user
      ? (profileForm.data.name ?? '') !== user.name ||
          (profileForm.data.division ?? '') !== user.division
      : false
  )

  const emailHasChanges = $derived(
    user ? (emailForm.data.email ?? '') !== (user.email ?? '') : false
  )

  const loading = $derived(profileForm.submitting || emailForm.submitting || deletingEmail)

  async function deleteEmail() {
    deletingEmail = true
    const res = await apiRequest(DeleteEmailRoute, {})
    if (res.kind === GoodEmailRemoved.kind) {
      toast.success('Email removed!')
      invalidateUser()
      emailForm.setData({ email: '' })
    } else {
      toast.error(res.message)
    }
    deletingEmail = false
  }

  function submitEmail(e: Event) {
    e.preventDefault()
    const email = (emailForm.data.email ?? '').trim()
    if (email === '' && canDeleteEmail) {
      deleteEmail()
    } else if (email) {
      emailForm.submit()
    }
  }
</script>

{#if user && clientConfig}
  <Section.Root>
    <Section.Header>Update profile</Section.Header>
    <Section.Content>
      <form onsubmit={profileForm.submit} class="flex flex-col gap-3">
        <Field.Field data-invalid={!!profileForm.errors.name || undefined}>
          <Field.Label>Team name</Field.Label>
          <Input
            type="text"
            placeholder="Enter your team name"
            autocomplete="username"
            autocorrect="off"
            minlength={2}
            maxlength={64}
            required
            bind:value={profileForm.data.name}
            disabled={loading}
          />
          {#if profileForm.errors.name}
            <Field.Error>{profileForm.errors.name}</Field.Error>
          {/if}
        </Field.Field>

        {#if allowedDivisionOptions.length > 1}
          <Field.Field data-invalid={!!profileForm.errors.division || undefined}>
            <Field.Label>Division</Field.Label>
            <Select.Root type="single" bind:value={profileForm.data.division} disabled={loading}>
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
            {#if profileForm.errors.division}
              <Field.Error>{profileForm.errors.division}</Field.Error>
            {/if}
          </Field.Field>
        {/if}

        {#if profileForm.errors._form}
          <div
            class="bg-background-destructive text-foreground-destructive rounded-md p-3 text-sm"
            role="alert"
          >
            {profileForm.errors._form}
          </div>
        {/if}

        <Button type="submit" disabled={loading || !profileHasChanges} class="w-full">
          {#if profileForm.submitting}
            <Spinner class="size-4" />
          {/if}
          Save profile
        </Button>
      </form>
    </Section.Content>
  </Section.Root>

  <Section.Root>
    <Section.Header>Email</Section.Header>
    <Section.Content>
      <form onsubmit={submitEmail} class="flex flex-col gap-3">
        <Field.Field
          data-invalid={!!emailForm.errors.email ||
            (!isEmailValid && (emailForm.data.email ?? '') !== '') ||
            undefined}
        >
          <Field.Label>
            Email
            {#if canDeleteEmail}
              <Field.Hint>(optional - leave empty to remove)</Field.Hint>
            {/if}
          </Field.Label>
          <Input
            type="email"
            placeholder="Enter your email"
            autocomplete="email"
            bind:value={emailForm.data.email}
            disabled={loading}
          />
          {#if emailForm.errors.email}
            <Field.Error>{emailForm.errors.email}</Field.Error>
          {:else if !isEmailValid && (emailForm.data.email ?? '') !== ''}
            <Field.Error>Please enter a valid email address</Field.Error>
          {/if}
        </Field.Field>

        {#if emailForm.errors._form}
          <div
            class="bg-background-destructive text-foreground-destructive rounded-md p-3 text-sm"
            role="alert"
          >
            {emailForm.errors._form}
          </div>
        {/if}

        <CaptchaNotice config={clientConfig} action={ProtectedAction.SetEmail} />

        <Button
          type="submit"
          disabled={loading || !emailHasChanges || !isEmailValid}
          class="w-full"
        >
          {#if emailForm.submitting || deletingEmail}
            <Spinner class="size-4" />
          {/if}
          {(emailForm.data.email ?? '').trim() === '' && canDeleteEmail
            ? 'Remove email'
            : 'Update email'}
        </Button>
      </form>
    </Section.Content>
  </Section.Root>
{/if}

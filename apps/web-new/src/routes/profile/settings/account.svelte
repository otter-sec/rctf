<script lang="ts">
  import type { ClientConfig, UserProfile } from '@rctf/types'
  import {
    DeleteEmailRoute,
    GoodEmailRemoved,
    GoodEmailSet,
    GoodVerifySent,
    ProtectedAction,
    SetEmailRouteV2,
    UpdateUserRouteV2,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { apiRequest, showApiError } from '$lib/api'
  import CaptchaNotice from '$lib/components/captcha-notice.svelte'
  import DivisionMenu from '$lib/components/division-menu.svelte'
  import FlagPicker from '$lib/components/flag-picker.svelte'
  import { useApiForm } from '$lib/forms/use-api-form.svelte'
  import { queryKeys } from '$lib/query/keys'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import Field from '$lib/ui/field.svelte'
  import Input from '$lib/ui/input.svelte'
  import { type MenuItem } from '$lib/ui/menu.svelte'
  import Section from '$lib/ui/section.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import {
    allowedDivisionOptions,
    canDeleteEmail as computeCanDeleteEmail,
    decideEmailBranch,
    emailButtonLabel,
    isEmailDirty,
    isEmailValid,
    isProfileDirty,
  } from './settings-logic'

  type Props = {
    user: UserProfile
    clientConfig: ClientConfig
  }

  let { user, clientConfig }: Props = $props()

  const queryClient = useQueryClient()
  const invalidateUser = () => queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })

  const profileForm = useApiForm(UpdateUserRouteV2, {
    // countryCode binds into FlagPicker's nullable $bindable — it must exist
    // as null before the seeding effect runs; binding undefined into a prop
    // with a fallback is a Svelte runtime error (props_invalid_value).
    defaults: { countryCode: null },
    onSuccess: () => {
      toast.success('Profile updated!')
      invalidateUser()
    },
    onError: response => showApiError(response),
  })

  const emailForm = useApiForm(SetEmailRouteV2, {
    onSuccess: response => {
      if (response.kind === GoodEmailSet.kind) {
        toast.success('Email updated!')
        invalidateUser()
      } else if (response.kind === GoodVerifySent.kind) {
        toast.success('Verification email sent. Check your inbox to finish updating your email.')
      }
    },
    onError: response => showApiError(response),
  })

  let initialized = $state(false)
  let deletingEmail = $state(false)

  // Seed both forms once from the current user; later invalidations refresh the
  // `user` prop for the dirty comparators without clobbering in-progress edits.
  $effect(() => {
    if (initialized) return
    profileForm.setData({
      name: user.name,
      division: user.division,
      countryCode: user.countryCode ?? null,
      statusText: user.statusText,
    })
    emailForm.setData({ email: user.email ?? '' })
    initialized = true
  })

  const divisionOptions = $derived(
    allowedDivisionOptions(clientConfig.divisions, user.allowedDivisions)
  )
  const showDivision = $derived(divisionOptions.length > 1)
  const selectedDivisionLabel = $derived(
    clientConfig.divisions[profileForm.data.division ?? ''] ?? 'Select division'
  )
  const divisionItems = $derived<MenuItem[]>(
    divisionOptions.map(option => ({
      value: option.value,
      label: option.label,
      checked: profileForm.data.division === option.value,
      onSelect: () => profileForm.setData({ division: option.value }),
    }))
  )

  const canDeleteEmail = $derived(
    computeCanDeleteEmail(clientConfig.emailEnabled, user.email, user.ctftimeId)
  )
  const emailValid = $derived(isEmailValid(emailForm.data.email))
  const emailNonEmpty = $derived((emailForm.data.email ?? '') !== '')

  const profileHasChanges = $derived(
    isProfileDirty(
      {
        name: profileForm.data.name,
        division: profileForm.data.division,
        countryCode: profileForm.data.countryCode,
        statusText: profileForm.data.statusText,
      },
      {
        name: user.name,
        division: user.division,
        countryCode: user.countryCode ?? null,
        statusText: user.statusText ?? null,
      }
    )
  )
  const emailHasChanges = $derived(isEmailDirty(emailForm.data.email, user.email))

  const loading = $derived(profileForm.submitting || emailForm.submitting || deletingEmail)

  const emailFieldError = $derived(
    emailForm.errors.email ??
      (!emailValid && emailNonEmpty ? 'Please enter a valid email address' : null)
  )
  const emailLabel = $derived(emailButtonLabel(emailForm.data.email, canDeleteEmail))

  async function deleteEmail() {
    deletingEmail = true
    try {
      const response = await apiRequest(DeleteEmailRoute, {})
      if (response.kind === GoodEmailRemoved.kind) {
        toast.success('Email removed!')
        emailForm.setData({ email: '' })
        invalidateUser()
      } else {
        showApiError(response)
      }
    } finally {
      deletingEmail = false
    }
  }

  function submitEmail(event: SubmitEvent) {
    event.preventDefault()
    const branch = decideEmailBranch(emailForm.data.email, canDeleteEmail)
    if (branch === 'delete') {
      deleteEmail()
    } else if (branch === 'put') {
      emailForm.submit()
    }
  }
</script>

<Section title="Update profile">
  <form onsubmit={profileForm.submit}>
    <Field label="Team name" error={profileForm.errors.name}>
      {#snippet children({ id, describedBy })}
        <Input
          {id}
          name="name"
          type="text"
          placeholder="Enter your team name"
          autocomplete="username"
          autocorrect="off"
          minlength={2}
          maxlength={64}
          required
          aria-describedby={describedBy}
          aria-invalid={!!profileForm.errors.name || undefined}
          bind:value={profileForm.data.name}
          oninput={() => profileForm.validateField('name')}
          disabled={loading}
        />
      {/snippet}
    </Field>

    {#if showDivision}
      <Field label="Division" error={profileForm.errors.division}>
        {#snippet children({ describedBy })}
          <DivisionMenu
            items={divisionItems}
            selectedLabel={selectedDivisionLabel}
            {describedBy}
            disabled={loading}
          />
        {/snippet}
      </Field>
    {/if}

    <Field label="Country" error={profileForm.errors.countryCode}>
      {#snippet children({ id, describedBy })}
        <FlagPicker
          {id}
          {describedBy}
          bind:value={profileForm.data.countryCode}
          disabled={loading}
        />
      {/snippet}
    </Field>

    <Field label="Status" description="Max 60 characters." error={profileForm.errors.statusText}>
      {#snippet children({ id, describedBy })}
        <Input
          {id}
          name="statusText"
          type="text"
          placeholder="Enter a status message"
          maxlength={60}
          aria-describedby={describedBy}
          aria-invalid={!!profileForm.errors.statusText || undefined}
          bind:value={profileForm.data.statusText}
          oninput={() => profileForm.validateField('statusText')}
          disabled={loading}
        />
      {/snippet}
    </Field>

    {#if profileForm.errors._form}
      <p role="alert">{profileForm.errors._form}</p>
    {/if}

    <Button type="submit" disabled={loading || !profileHasChanges}>
      {#if profileForm.submitting}
        <Spinner />
      {/if}
      Save profile
    </Button>
  </form>
</Section>

<Section title="Email">
  <form onsubmit={submitEmail}>
    <Field
      label="Email"
      description={canDeleteEmail ? 'Optional — leave empty to remove.' : undefined}
      error={emailFieldError}
    >
      {#snippet children({ id, describedBy })}
        <Input
          {id}
          name="email"
          type="email"
          placeholder="Enter your email"
          autocomplete="email"
          aria-describedby={describedBy}
          aria-invalid={!!emailFieldError || undefined}
          bind:value={emailForm.data.email}
          disabled={loading}
        />
      {/snippet}
    </Field>

    {#if emailForm.errors._form}
      <p role="alert">{emailForm.errors._form}</p>
    {/if}

    <CaptchaNotice config={clientConfig} action={ProtectedAction.SetEmail} />

    <Button type="submit" disabled={loading || !emailHasChanges || !emailValid}>
      {#if emailForm.submitting || deletingEmail}
        <Spinner />
      {/if}
      {emailLabel}
    </Button>
  </form>
</Section>

<style>
  form {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);

    :global(button[type='submit']) {
      inline-size: 100%;
    }
  }

  p[role='alert'] {
    margin: 0;
    padding: var(--space-2xs);
    font-size: var(--step--1);
    color: var(--foreground-destructive);
    background: var(--background-destructive);
    border-radius: var(--radius-md);
  }
</style>

<script lang="ts">
  import type { ClientConfig, UserProfile } from '@rctf/types'
  import {
    DeleteCtftimeRoute,
    DeleteEmailRoute,
    GoodCtftimeAuthSet,
    GoodCtftimeRemoved,
    GoodEmailRemoved,
    GoodEmailSet,
    GoodVerifySent,
    ProtectedAction,
    SetCtftimeRoute,
    SetEmailRouteV2,
    UpdateUserRouteV2,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { apiRequest, showApiError } from '$lib/api'
  import CtftimeIcon from '$lib/assets/ctftime.svg?raw'
  import { Button, Field, FlagPicker, Input, Section, Select, Spinner } from '$lib/components'
  import CaptchaNotice from '$lib/components/captcha-notice.svelte'
  import { useApiForm } from '$lib/forms'
  import { queryKeys, useCtftimeCallbackMutation } from '$lib/query'
  import { onDestroy, onMount } from 'svelte'
  import { toast } from 'svelte-sonner'

  interface Props {
    user: UserProfile
    clientConfig: ClientConfig
  }

  let { user, clientConfig }: Props = $props()

  const queryClient = useQueryClient()

  const invalidateUser = () => queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })

  const profileForm = useApiForm(UpdateUserRouteV2, {
    onSuccess: () => {
      toast.success('Profile updated!')
      invalidateUser()
    },
    onError: response => {
      showApiError(response)
    },
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
    onError: response => {
      showApiError(response)
    },
  })

  let initialized = $state(false)
  let deletingEmail = $state(false)
  let settingCtftime = $state(false)
  let deletingCtftime = $state(false)
  let ctftimeOauthState: string | null = $state(null)

  const ctftimeMutation = useCtftimeCallbackMutation()

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const isEmailValid = $derived(
    (emailForm.data.email ?? '') === '' || EMAIL_REGEX.test((emailForm.data.email ?? '').trim())
  )

  $effect(() => {
    if (!initialized) {
      profileForm.setData({
        name: user.name,
        division: user.division,
        countryCode: user.countryCode,
        statusText: user.statusText,
      })
      emailForm.setData({ email: user.email ?? '' })
      initialized = true
    }
  })

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
    clientConfig.divisions[profileForm.data.division ?? ''] ?? 'Select division'
  )

  // Can only delete email if user has an alternative auth method (linked CTFtime)
  const canDeleteEmail = $derived(clientConfig.emailEnabled && user.email && user.ctftimeId)

  // Can only delete CTFtime if user has an alternative auth method (email)
  const canDeleteCtftime = $derived(clientConfig.ctftime && user.ctftimeId && user.email)

  const profileHasChanges = $derived(
    (profileForm.data.name ?? '') !== user.name ||
      (profileForm.data.division ?? '') !== user.division ||
      (profileForm.data.countryCode ?? null) !== (user.countryCode ?? null) ||
      (profileForm.data.statusText ?? null) !== (user.statusText ?? null)
  )

  const emailHasChanges = $derived((emailForm.data.email ?? '') !== (user.email ?? ''))

  const loading = $derived(
    profileForm.submitting ||
      emailForm.submitting ||
      deletingEmail ||
      settingCtftime ||
      deletingCtftime ||
      ctftimeMutation.isPending
  )

  async function deleteEmail() {
    deletingEmail = true
    try {
      const res = await apiRequest(DeleteEmailRoute, {})
      if (res.kind === GoodEmailRemoved.kind) {
        toast.success('Email removed!')
        invalidateUser()
        emailForm.setData({ email: '' })
      } else {
        showApiError(res)
      }
    } finally {
      deletingEmail = false
    }
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

  function getOauthState(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(v => v.toString(16).padStart(2, '0'))
      .join('')
  }

  function openCtftimePopup() {
    if (!clientConfig.ctftime) return

    const state = getOauthState()
    ctftimeOauthState = state

    const w = 600
    const h = 500
    const systemZoom = window.innerWidth / window.screen.availWidth
    const left = (window.innerWidth - w) / 2 / systemZoom + window.screenLeft
    const top = (window.innerHeight - h) / 2 / systemZoom + window.screenTop

    const url =
      'https://oauth.ctftime.org/authorize' +
      `?scope=${encodeURIComponent('team:read')}` +
      `&client_id=${encodeURIComponent(clientConfig.ctftime.clientId)}` +
      `&redirect_uri=${encodeURIComponent(`${location.origin}/integrations/ctftime/callback`)}` +
      `&state=${encodeURIComponent(state)}`

    const popup = window.open(
      url,
      'CTFtime',
      [
        'scrollbars',
        'resizable',
        `width=${w / systemZoom}`,
        `height=${h / systemZoom}`,
        `top=${top}`,
        `left=${left}`,
      ].join(',')
    )
    popup?.focus()
  }

  function handleCtftimePostMessage(evt: MessageEvent) {
    if (evt.origin !== location.origin || evt.data.kind !== 'ctftimeCallback') {
      return
    }
    if (ctftimeOauthState === null || evt.data.state !== ctftimeOauthState) {
      return
    }

    ctftimeMutation.mutate(
      { ctftimeCode: evt.data.ctftimeCode },
      {
        onSuccess: async response => {
          if (response.kind === 'goodCtftimeToken') {
            await setCtftime(response.data.ctftimeToken)
          } else {
            showApiError(response)
          }
          ctftimeOauthState = null
        },
        onError: error => {
          toast.error(error.message)
          ctftimeOauthState = null
        },
      }
    )
  }

  async function setCtftime(ctftimeToken: string) {
    settingCtftime = true
    try {
      const res = await apiRequest(SetCtftimeRoute, { ctftimeToken })
      if (res.kind === GoodCtftimeAuthSet.kind) {
        toast.success('CTFtime account linked!')
        invalidateUser()
      } else {
        showApiError(res)
      }
    } finally {
      settingCtftime = false
    }
  }

  async function deleteCtftime() {
    deletingCtftime = true
    try {
      const res = await apiRequest(DeleteCtftimeRoute, {})
      if (res.kind === GoodCtftimeRemoved.kind) {
        toast.success('CTFtime account unlinked!')
        invalidateUser()
      } else {
        showApiError(res)
      }
    } finally {
      deletingCtftime = false
    }
  }

  onMount(() => {
    window.addEventListener('message', handleCtftimePostMessage)
  })

  onDestroy(() => {
    window.removeEventListener('message', handleCtftimePostMessage)
  })
</script>

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

      <Field.Field data-invalid={!!profileForm.errors.countryCode || undefined}>
        <Field.Label>Country</Field.Label>
        <FlagPicker
          bind:value={profileForm.data.countryCode}
          disabled={loading}
          class="bg-background-l4 hover:bg-background-l5"
        />
        {#if profileForm.errors.countryCode}
          <Field.Error>{profileForm.errors.countryCode}</Field.Error>
        {/if}
      </Field.Field>

      <Field.Field data-invalid={!!profileForm.errors.statusText || undefined}>
        <Field.Label>
          Status
          <Field.Hint>(max 60 characters)</Field.Hint>
        </Field.Label>
        <Input
          type="text"
          placeholder="Enter a status message"
          maxlength={60}
          bind:value={profileForm.data.statusText}
          disabled={loading}
        />
        {#if profileForm.errors.statusText}
          <Field.Error>{profileForm.errors.statusText}</Field.Error>
        {/if}
      </Field.Field>

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

      <Button type="submit" disabled={loading || !emailHasChanges || !isEmailValid} class="w-full">
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

{#if clientConfig.ctftime}
  <Section.Root>
    <Section.Header>CTFtime</Section.Header>
    <Section.Content>
      <div class="flex flex-col gap-3">
        {#if user.ctftimeId}
          <div class="bg-background-l4 flex items-center justify-between rounded-lg px-4 py-3">
            <div class="flex items-center gap-3">
              <span class="text-foreground-l3 inline-flex [&_svg]:h-5 [&_svg]:w-auto">
                {@html CtftimeIcon}
              </span>
              <div class="flex flex-col">
                <span class="text-foreground text-sm font-medium">Team #{user.ctftimeId}</span>
                <a
                  href="https://ctftime.org/team/{user.ctftimeId}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-foreground-l4 hover:text-foreground text-xs transition-colors"
                >
                  View on CTFtime →
                </a>
              </div>
            </div>
          </div>

          {#if canDeleteCtftime}
            <Button
              type="button"
              variant="outline"
              onclick={deleteCtftime}
              disabled={loading}
              class="w-full"
            >
              {#if deletingCtftime}
                <Spinner class="size-4" />
              {/if}
              Unlink CTFtime
            </Button>
          {:else}
            <p class="text-foreground-l4 text-xs">
              Add an email address to your account before unlinking CTFtime.
            </p>
          {/if}
        {:else}
          <p class="text-foreground-l3 text-sm">
            Link your CTFtime account to enable CTFtime login and display your team on your profile.
          </p>

          <Button
            type="button"
            variant="outline"
            onclick={openCtftimePopup}
            disabled={loading}
            class="w-full py-0 [&_svg:not([class*='size-'])]:h-6 [&_svg:not([class*='size-'])]:w-auto"
          >
            {#if ctftimeMutation.isPending || settingCtftime}
              <Spinner class="size-4" />
              <span>Connecting...</span>
            {:else}
              <span class="inline-flex">
                {@html CtftimeIcon}
              </span>
              <span>Link CTFtime</span>
            {/if}
          </Button>
        {/if}
      </div>
    </Section.Content>
  </Section.Root>
{/if}

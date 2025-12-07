<script lang="ts">
  import {
    GoodEmailRemoved,
    GoodEmailSet,
    GoodUserUpdateV2,
    GoodVerifySent,
    ProtectedAction,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { toast } from '$lib'
  import { Button, Field, Input, Section, Select, Spinner } from '$lib/components'
  import CaptchaNotice from '$lib/components/captcha-notice.svelte'
  import {
    queryKeys,
    useClientConfig,
    useCurrentUser,
    useDeleteEmailMutation,
    useSetEmailMutation,
    useUpdateUserMutation,
  } from '$lib/query'

  const queryClient = useQueryClient()
  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()
  const updateUserMutation = useUpdateUserMutation()
  const setEmailMutation = useSetEmailMutation()
  const deleteEmailMutation = useDeleteEmailMutation()

  const user = $derived($userQuery.data)
  const clientConfig = $derived($clientConfigQuery.data)

  let name = $state('')
  let email = $state('')
  let division = $state('')
  let errors = $state<Record<string, string | null>>({})
  let initialized = $state(false)

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const isEmailValid = $derived(email === '' || EMAIL_REGEX.test(email.trim()))

  $effect(() => {
    if (user && !initialized) {
      name = user.name
      email = user.email ?? ''
      division = user.division
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

  const selectedDivisionLabel = $derived(clientConfig?.divisions[division] ?? 'Select division')

  const canDeleteEmail = $derived(clientConfig?.emailEnabled && user?.email)

  const hasChanges = $derived(
    user ? name !== user.name || email !== (user.email ?? '') || division !== user.division : false
  )

  const loading = $derived(
    $updateUserMutation.isPending || $setEmailMutation.isPending || $deleteEmailMutation.isPending
  )

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()

    if (!user) return

    if (!hasChanges) {
      toast.info('No changes to save')
      return
    }

    errors = {}
    let updated = false

    if (name !== user.name || division !== user.division) {
      await new Promise<void>((resolve, reject) => {
        $updateUserMutation.mutate(
          {
            name: name !== user.name ? name : undefined,
            division: division !== user.division ? division : undefined,
          },
          {
            onSuccess: response => {
              if (response.kind === GoodUserUpdateV2.kind) {
                toast.success('Profile updated successfully!')
                updated = true
                resolve()
              } else {
                const msg = response.message
                if (msg.toLowerCase().includes('name')) {
                  errors = { ...errors, name: msg }
                } else if (msg.toLowerCase().includes('division')) {
                  errors = { ...errors, division: msg }
                } else {
                  errors = { ...errors, form: msg }
                }
                resolve()
              }
            },
            onError: error => {
              errors = { ...errors, form: error.message }
              resolve()
            },
          }
        )
      })
    }

    if (email !== (user.email ?? '')) {
      if (email === '' && canDeleteEmail) {
        await new Promise<void>(resolve => {
          $deleteEmailMutation.mutate(
            {},
            {
              onSuccess: response => {
                if (response.kind === GoodEmailRemoved.kind) {
                  toast.success('Email removed successfully!')
                  updated = true
                } else {
                  errors = { ...errors, email: response.message }
                }
                resolve()
              },
              onError: error => {
                errors = { ...errors, email: error.message }
                resolve()
              },
            }
          )
        })
      } else if (email !== '') {
        await new Promise<void>(resolve => {
          $setEmailMutation.mutate(
            { email },
            {
              onSuccess: response => {
                if (response.kind === GoodEmailSet.kind) {
                  toast.success('Email updated successfully!')
                  updated = true
                } else if (response.kind === GoodVerifySent.kind) {
                  toast.success('Verification email sent. Please check your inbox.')
                  updated = true
                } else {
                  errors = { ...errors, email: response.message }
                }
                resolve()
              },
              onError: error => {
                errors = { ...errors, email: error.message }
                resolve()
              },
            }
          )
        })
      }
    }

    if (updated) {
      queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
    }
  }
</script>

{#if user && clientConfig}
  <Section.Root>
    <Section.Header>Update profile</Section.Header>
    <Section.Content>
      {#if errors.form}
        <div
          class="bg-background-destructive text-foreground-destructive mb-3 rounded-md p-3 text-sm"
          role="alert">
          {errors.form}
        </div>
      {/if}

      <form onsubmit={handleSubmit} class="flex flex-col gap-3">
        <Field.Field data-invalid={!!errors.name || undefined}>
          <Field.Label>Team name</Field.Label>
          <Input
            type="text"
            placeholder="Enter your team name"
            autocomplete="username"
            autocorrect="off"
            minlength={2}
            maxlength={64}
            required
            bind:value={name} />
          {#if errors.name}
            <Field.Error>{errors.name}</Field.Error>
          {/if}
        </Field.Field>

        <Field.Field data-invalid={!!errors.email || (!isEmailValid && email !== '') || undefined}>
          <Field.Label>
            Email
            {#if canDeleteEmail}
              <Field.Hint>(optional)</Field.Hint>
            {/if}
          </Field.Label>
          <Input
            type="email"
            placeholder="Enter your email"
            autocomplete="email"
            bind:value={email} />
          {#if errors.email}
            <Field.Error>{errors.email}</Field.Error>
          {:else if !isEmailValid && email !== ''}
            <Field.Error>Please enter a valid email address</Field.Error>
          {/if}
        </Field.Field>

        <CaptchaNotice config={clientConfig} action={ProtectedAction.SetEmail} />

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

        <Button type="submit" disabled={loading || !hasChanges || !isEmailValid} class="w-full">
          {#if loading}
            <Spinner class="size-4" />
          {/if}
          Save changes
        </Button>
      </form>
    </Section.Content>
  </Section.Root>
{/if}

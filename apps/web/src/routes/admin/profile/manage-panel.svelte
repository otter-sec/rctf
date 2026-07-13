<script lang="ts">
  import type { ClientConfig } from '@rctf/types'
  import {
    CreateUserTokenRouteV2,
    DeleteAdminUserRouteV2,
    GoodAdminUserDeleteV2,
    GoodAdminUserUpdateV2,
    GoodAvatarUpdated,
    GoodCreateUserTokenV2,
    Permissions,
    UpdateAdminUserAvatarRouteV2,
    UpdateAdminUserRouteV2,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { apiRequest, showApiError } from '$lib/api'
  import AvatarUpload from '$lib/components/avatar-upload.svelte'
  import DivisionMenu from '$lib/components/division-menu.svelte'
  import FlagPicker from '$lib/components/flag-picker.svelte'
  import { IconCopy, IconFunnel, IconKey, IconTrash } from '$lib/icons'
  import { invalidateAdminTeamQueries, useAdminUser } from '$lib/query/admin'
  import { useClientConfig } from '$lib/query/config'
  import { queryKeys } from '$lib/query/keys'
  import { useCurrentUser } from '$lib/query/user'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import Card from '$lib/ui/card.svelte'
  import Field from '$lib/ui/field.svelte'
  import Input from '$lib/ui/input.svelte'
  import { type MenuItem } from '$lib/ui/menu.svelte'
  import Section from '$lib/ui/section.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { createAsyncAction } from '$lib/utils/async-action.svelte'
  import { buildLoginUrl } from '$lib/utils/auth'
  import { copyText } from '$lib/utils/clipboard'
  import { hasPermissions } from '$lib/utils/permissions'
  import { createConfirmState } from '../confirm-state.svelte'
  import ConfirmDialog from './confirm-dialog.svelte'
  import {
    buildUserUpdate,
    divisionOptions,
    isManageDirty,
    type ManageForm,
  } from './manage-panel-logic'

  type Props = {
    userId: string
  }

  let { userId }: Props = $props()

  type DivisionRecord = Record<string, string>
  type ActionKind = 'token' | 'url' | 'ban' | 'delete'

  const queryClient = useQueryClient()
  const currentUserQuery = useCurrentUser()
  const configQuery = useClientConfig()

  const canWrite = $derived(hasPermissions(currentUserQuery.data, Permissions.usersWrite))
  const adminUserQuery = useAdminUser(() => (canWrite ? userId : null))

  const adminUser = $derived(adminUserQuery.data)

  const revealAfterLoading = adminUserQuery.isPending
  const clientConfig = $derived<ClientConfig | undefined>(configQuery.data)

  const action = createAsyncAction<ActionKind>()
  const saveAction = createAsyncAction()
  const avatarAction = createAsyncAction()
  const busy = $derived(action.pending || saveAction.pending || avatarAction.pending)

  const confirmState = createConfirmState()

  let form = $state<ManageForm>({
    name: '',
    division: '',
    countryCode: null,
    statusText: null,
  })
  let seeded = $state(false)

  $effect(() => {
    if (seeded || !adminUser) return
    form = {
      name: adminUser.name,
      division: adminUser.division,
      countryCode: adminUser.countryCode ?? null,
      statusText: adminUser.statusText ?? null,
    }
    seeded = true
  })

  const divisions = $derived<DivisionRecord>(clientConfig?.divisions ?? {})
  const showDivision = $derived(Object.keys(divisions).length > 1)
  const divisionItems = $derived<MenuItem[]>(
    divisionOptions(divisions).map(option => ({
      value: option.value,
      label: option.label,
      checked: form.division === option.value,
      onSelect: () => (form.division = option.value),
    }))
  )
  const selectedDivisionLabel = $derived(divisions[form.division] ?? 'Select division')

  const dirty = $derived(
    !!adminUser &&
      isManageDirty(form, {
        name: adminUser.name,
        division: adminUser.division,
        countryCode: adminUser.countryCode ?? null,
        statusText: adminUser.statusText ?? null,
      })
  )

  function invalidateTeam() {
    invalidateAdminTeamQueries(queryClient)
    queryClient.invalidateQueries({ queryKey: queryKeys.userById(userId) })
  }

  async function submitAvatar(args: { avatar?: File }, message: string): Promise<boolean> {
    const result = await avatarAction.run(
      async () => {
        const response = await apiRequest(UpdateAdminUserAvatarRouteV2, { id: userId, ...args })
        if (response.kind === GoodAvatarUpdated.kind) {
          toast.success(message)
          invalidateTeam()
          return true
        }
        showApiError(response)
        return false
      },
      { errorMessage: 'Avatar update failed' }
    )
    return result ?? false
  }

  const uploadAvatar = (file: File) => submitAvatar({ avatar: file }, 'Avatar updated!')
  const removeAvatar = () => submitAvatar({}, 'Avatar removed!')

  async function saveProfile(event: SubmitEvent) {
    event.preventDefault()
    await saveAction.run(
      async () => {
        const response = await apiRequest(UpdateAdminUserRouteV2, {
          id: userId,
          data: buildUserUpdate(form),
        })
        if (response.kind === GoodAdminUserUpdateV2.kind) {
          toast.success('Team updated!')
          invalidateTeam()
        } else {
          showApiError(response)
        }
      },
      { errorMessage: 'Failed to update team' }
    )
  }

  async function mintToken(): Promise<string | null> {
    const response = await apiRequest(CreateUserTokenRouteV2, { id: userId })
    if (response.kind === GoodCreateUserTokenV2.kind) {
      return response.data.token
    }
    showApiError(response)
    return null
  }

  async function copyToken() {
    await action.run(
      async () => {
        const token = await mintToken()
        if (token) await copyText(token, 'Login token copied to clipboard!')
      },
      { key: 'token', errorMessage: 'Failed to create login token' }
    )
  }

  async function copyLoginUrl() {
    await action.run(
      async () => {
        const token = await mintToken()
        if (token) await copyText(buildLoginUrl(token), 'Login URL copied to clipboard!')
      },
      { key: 'url', errorMessage: 'Failed to create login URL' }
    )
  }

  async function setBanned(banned: boolean) {
    await action.run(
      async () => {
        const response = await apiRequest(UpdateAdminUserRouteV2, { id: userId, data: { banned } })
        if (response.kind === GoodAdminUserUpdateV2.kind) {
          toast.success(banned ? 'Team banned.' : 'Team unbanned.')
          invalidateTeam()
        } else {
          showApiError(response)
        }
      },
      { key: 'ban', errorMessage: `Failed to ${banned ? 'ban' : 'unban'} team` }
    )
  }

  async function deleteTeam() {
    await action.run(
      async () => {
        const response = await apiRequest(DeleteAdminUserRouteV2, { id: userId })
        if (response.kind === GoodAdminUserDeleteV2.kind) {
          toast.success('Team deleted.')
          invalidateTeam()
          await goto('/admin/teams')
        } else {
          showApiError(response)
        }
      },
      { key: 'delete', errorMessage: 'Failed to delete team' }
    )
  }

  function viewSubmissions() {
    goto(`/admin/submissions?team=${encodeURIComponent(userId)}`)
  }

  function requestCopyToken() {
    confirmState.request({
      title: 'Copy login token',
      message:
        'This token grants full, non-expiring access to the account. Anyone with it can log in as this team until the account is deleted.',
      confirmLabel: 'Copy token',
      destructive: false,
      run: copyToken,
    })
  }

  function requestCopyLoginUrl() {
    confirmState.request({
      title: 'Copy login URL',
      message:
        'This link grants full, non-expiring access to the account. Anyone with it can log in as this team until the account is deleted.',
      confirmLabel: 'Copy URL',
      destructive: false,
      run: copyLoginUrl,
    })
  }

  function requestBanToggle() {
    if (adminUser?.banned) {
      setBanned(false)
      return
    }
    confirmState.request({
      title: 'Ban team',
      message:
        'Banning removes the team from the leaderboard but keeps the account and its solve history.',
      confirmLabel: 'Ban team',
      destructive: true,
      run: () => setBanned(true),
    })
  }

  function requestDelete() {
    confirmState.request({
      title: 'Delete team',
      message: 'This removes the team and its solves from the database. This cannot be undone.',
      confirmLabel: 'Delete team',
      destructive: true,
      run: deleteTeam,
    })
  }
</script>

{#if currentUserQuery.isLoading || (canWrite && adminUserQuery.isPending)}
  <manage-status>
    <Spinner />
  </manage-status>
{:else if !canWrite}
  <Card title="Manage unavailable">
    <p>Your account needs the manage-teams permission to edit this team.</p>
  </Card>
{:else if adminUser && clientConfig}
  <manage-panel data-reveal={revealAfterLoading || undefined}>
    <AvatarUpload
      name={adminUser.name}
      avatarUrl={adminUser.avatarUrl}
      loading={avatarAction.pending}
      onUpload={uploadAvatar}
      onRemove={removeAvatar}
    />

    <Section title="Edit profile">
      <form onsubmit={saveProfile}>
        <Field label="Team name">
          {#snippet children({ id, describedBy })}
            <Input
              {id}
              name="name"
              type="text"
              placeholder="Team name"
              minlength={2}
              maxlength={64}
              required
              aria-describedby={describedBy}
              bind:value={form.name}
              disabled={busy}
            />
          {/snippet}
        </Field>

        {#if showDivision}
          <Field label="Division">
            {#snippet children({ describedBy })}
              <DivisionMenu
                items={divisionItems}
                selectedLabel={selectedDivisionLabel}
                {describedBy}
                disabled={busy}
              />
            {/snippet}
          </Field>
        {/if}

        <Field label="Country">
          {#snippet children({ id, describedBy })}
            <FlagPicker {id} {describedBy} bind:value={form.countryCode} disabled={busy} />
          {/snippet}
        </Field>

        <Field label="Status" description="Max 60 characters.">
          {#snippet children({ id, describedBy })}
            <Input
              {id}
              name="statusText"
              type="text"
              placeholder="Status message"
              maxlength={60}
              aria-describedby={describedBy}
              bind:value={form.statusText}
              disabled={busy}
            />
          {/snippet}
        </Field>

        <Button type="submit" disabled={busy || !dirty}>
          {#if saveAction.pending}
            <Spinner />
          {/if}
          Save changes
        </Button>
      </form>
    </Section>

    <Section title="Actions">
      <manage-actions>
        <Button variant="secondary" disabled={busy} onclick={requestCopyToken}>
          {#if action.key === 'token'}
            <Spinner />
          {:else}
            <IconKey />
          {/if}
          Copy login token
        </Button>

        <Button variant="secondary" disabled={busy} onclick={requestCopyLoginUrl}>
          {#if action.key === 'url'}
            <Spinner />
          {:else}
            <IconCopy />
          {/if}
          Copy login URL
        </Button>

        <Button variant="secondary" disabled={busy} onclick={viewSubmissions}>
          <IconFunnel />
          View submissions
        </Button>

        <Button variant="secondary" disabled={busy} onclick={requestBanToggle}>
          {#if action.key === 'ban'}
            <Spinner />
          {/if}
          {adminUser.banned ? 'Unban team' : 'Ban team'}
        </Button>

        <Button variant="destructive" disabled={busy} onclick={requestDelete}>
          {#if action.key === 'delete'}
            <Spinner />
          {:else}
            <IconTrash />
          {/if}
          Delete team
        </Button>
      </manage-actions>
    </Section>
  </manage-panel>
{/if}

<ConfirmDialog
  open={confirmState.current !== null}
  onOpenChange={open => {
    if (!open) confirmState.cancel()
  }}
  title={confirmState.current?.title ?? ''}
  message={confirmState.current?.message ?? ''}
  confirmLabel={confirmState.current?.confirmLabel ?? 'Confirm'}
  destructive={confirmState.current?.destructive ?? false}
  onConfirm={confirmState.confirm}
/>

<style>
  manage-status {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: var(--space-l);
  }

  manage-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);

    :global(button[type='submit']) {
      inline-size: 100%;
    }
  }

  manage-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);

    :global(a),
    :global(button) {
      justify-content: flex-start;
      inline-size: 100%;
    }
  }
</style>

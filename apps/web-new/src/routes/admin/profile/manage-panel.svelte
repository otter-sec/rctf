<!--
  Admin "Manage" column for /admin/profile/[id]. Requires usersWrite; without it
  a hint replaces the controls. All writes follow the app idiom (apiRequest +
  local pending state + explicit invalidation) rather than svelte-query
  mutations. The token/login-URL actions are gated behind a confirmation dialog
  because the minted value grants full, non-expiring account access (R25/R36
  recorded deviation from the old app, which copied silently).
-->
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
  import FlagPicker from '$lib/components/flag-picker.svelte'
  import IconChevronDown from '$lib/icons/icon-chevron-down.svelte'
  import IconCopy from '$lib/icons/icon-copy.svelte'
  import IconFilter from '$lib/icons/icon-filter.svelte'
  import IconKeyFilled from '$lib/icons/icon-key-filled.svelte'
  import IconTrashFilled from '$lib/icons/icon-trash-filled.svelte'
  import { invalidateAdminTeamQueries, useAdminUser } from '$lib/query/admin'
  import { useClientConfig } from '$lib/query/config'
  import { queryKeys } from '$lib/query/keys'
  import { useCurrentUser } from '$lib/query/user'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import Card from '$lib/ui/card.svelte'
  import Field from '$lib/ui/field.svelte'
  import Input from '$lib/ui/input.svelte'
  import Menu, { type MenuItem } from '$lib/ui/menu.svelte'
  import Section from '$lib/ui/section.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
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
  const clientConfig = $derived<ClientConfig | undefined>(configQuery.data)

  let pendingAction = $state<ActionKind | null>(null)
  let savingProfile = $state(false)
  let avatarLoading = $state(false)
  const busy = $derived(pendingAction !== null || savingProfile || avatarLoading)

  const confirmState = createConfirmState()

  let form = $state<ManageForm>({
    name: '',
    division: '',
    countryCode: null,
    statusText: null,
  })
  let seeded = $state(false)

  // Seed the edit form once the admin detail resolves; later invalidations
  // refresh `adminUser` for the dirty comparator without clobbering edits.
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
    avatarLoading = true
    try {
      const response = await apiRequest(UpdateAdminUserAvatarRouteV2, { id: userId, ...args })
      if (response.kind === GoodAvatarUpdated.kind) {
        toast.success(message)
        invalidateTeam()
        return true
      }
      showApiError(response)
      return false
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Avatar update failed')
      return false
    } finally {
      avatarLoading = false
    }
  }

  const uploadAvatar = (file: File) => submitAvatar({ avatar: file }, 'Avatar updated!')
  const removeAvatar = () => submitAvatar({}, 'Avatar removed!')

  async function saveProfile(event: SubmitEvent) {
    event.preventDefault()
    savingProfile = true
    try {
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
    } finally {
      savingProfile = false
    }
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
    pendingAction = 'token'
    try {
      const token = await mintToken()
      if (token) await copyText(token, 'Login token copied to clipboard!')
    } finally {
      pendingAction = null
    }
  }

  async function copyLoginUrl() {
    pendingAction = 'url'
    try {
      const token = await mintToken()
      if (token) await copyText(buildLoginUrl(token), 'Login URL copied to clipboard!')
    } finally {
      pendingAction = null
    }
  }

  async function setBanned(banned: boolean) {
    pendingAction = 'ban'
    try {
      const response = await apiRequest(UpdateAdminUserRouteV2, { id: userId, data: { banned } })
      if (response.kind === GoodAdminUserUpdateV2.kind) {
        toast.success(banned ? 'Team banned.' : 'Team unbanned.')
        invalidateTeam()
      } else {
        showApiError(response)
      }
    } finally {
      pendingAction = null
    }
  }

  async function deleteTeam() {
    pendingAction = 'delete'
    try {
      const response = await apiRequest(DeleteAdminUserRouteV2, { id: userId })
      if (response.kind === GoodAdminUserDeleteV2.kind) {
        toast.success('Team deleted.')
        invalidateTeam()
        await goto('/admin/teams')
      } else {
        showApiError(response)
      }
    } finally {
      pendingAction = null
    }
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
  <manage-panel>
    <AvatarUpload
      name={adminUser.name}
      avatarUrl={adminUser.avatarUrl}
      loading={avatarLoading}
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
              <Menu label="Select division" items={divisionItems} placement="bottom-start">
                {#snippet trigger({ props })}
                  <button
                    {...props}
                    type="button"
                    data-division-trigger
                    aria-describedby={describedBy}
                    disabled={busy}
                  >
                    <span>{selectedDivisionLabel}</span>
                    <IconChevronDown aria-hidden="true" />
                  </button>
                {/snippet}
              </Menu>
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
          {#if savingProfile}
            <Spinner />
          {/if}
          Save changes
        </Button>
      </form>
    </Section>

    <Section title="Actions">
      <manage-actions>
        <Button variant="secondary" disabled={busy} onclick={requestCopyToken}>
          {#if pendingAction === 'token'}
            <Spinner />
          {:else}
            <IconKeyFilled />
          {/if}
          Copy login token
        </Button>

        <Button variant="secondary" disabled={busy} onclick={requestCopyLoginUrl}>
          {#if pendingAction === 'url'}
            <Spinner />
          {:else}
            <IconCopy />
          {/if}
          Copy login URL
        </Button>

        <Button variant="secondary" disabled={busy} onclick={viewSubmissions}>
          <IconFilter />
          View submissions
        </Button>

        <Button variant="secondary" disabled={busy} onclick={requestBanToggle}>
          {#if pendingAction === 'ban'}
            <Spinner />
          {/if}
          {adminUser.banned ? 'Unban team' : 'Ban team'}
        </Button>

        <Button variant="destructive" disabled={busy} onclick={requestDelete}>
          {#if pendingAction === 'delete'}
            <Spinner />
          {:else}
            <IconTrashFilled />
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

  button[data-division-trigger] {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3xs);
    inline-size: 100%;
    block-size: 2.25rem;
    padding-inline: var(--space-2xs);
    color: var(--foreground-l0);
    background: var(--background-l4);
    border: 2px solid transparent;
    border-radius: var(--radius-md);
    cursor: pointer;

    span {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    :global(svg) {
      flex-shrink: 0;
      opacity: 0.5;
    }

    &:hover {
      background: var(--background-l5);
    }

    &[data-state='open'] {
      border-color: var(--border);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -1px;
    }

    &:disabled {
      pointer-events: none;
      opacity: 0.5;
    }
  }
</style>

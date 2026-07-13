<script lang="ts">
  import {
    AdminTeamSortBy,
    CompleteAdminUserVerificationRouteV2,
    CreateUserTokenRouteV2,
    DeleteAdminUserRouteV2,
    GoodAdminUserDeleteV2,
    GoodAdminUserUpdateV2,
    GoodAdminUserVerificationCompleteV2,
    GoodAdminUserVerificationResendV2,
    GoodCreateUserTokenV2,
    Permissions,
    ResendAdminUserVerificationRouteV2,
    SortOrder,
    UpdateAdminUserRouteV2,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { apiRequest, showApiError } from '$lib/api'
  import {
    clearFilter,
    createFilter,
    type MultiFilter,
  } from '$lib/filters/core'
  import type { ValueFilterFamily } from '$lib/filters/ui'
  import {
    invalidateAdminTeamQueries,
    useAdminUsersInfinite,
    useAdminUserVerifications,
  } from '$lib/query/admin'
  import { useClientConfig } from '$lib/query/config'
  import { queryKeys } from '$lib/query/keys'
  import { useCurrentUser } from '$lib/query/user'
  import { toast } from '$lib/toast'
  import Card from '$lib/ui/card.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { createAsyncAction } from '$lib/utils/async-action.svelte'
  import { copyText } from '$lib/utils/clipboard'
  import { hasPermissions } from '$lib/utils/permissions'
  import type { SortState } from '../admin-table-logic'
  import { createConfirmState } from '../confirm-state.svelte'
  import ConfirmDialog from '../profile/confirm-dialog.svelte'
  import { divisionFilterFamily, statusFilterFamily } from './teams-families'
  import {
    pendingVerificationMatchesFilters,
    registeredRowsMayMatch,
    sortTeamRows,
    teamFingerprint,
    teamQueryParams,
    type DivisionOption,
    type TeamFilters,
    type TeamRow,
    type TeamStatusValue,
  } from './teams-model'
  import TeamsTable from './teams-table.svelte'

  type TeamRef = { id: string; name: string }
  type BanRef = TeamRef & { banned: boolean }

  const queryClient = useQueryClient()
  const configQuery = useClientConfig()
  const currentUserQuery = useCurrentUser()

  const clientConfig = $derived(configQuery.data)
  const divisions = $derived<Record<string, string>>(
    clientConfig?.divisions ?? {}
  )
  const divisionOptions = $derived<DivisionOption[]>(
    Object.entries(divisions).map(([value, label]) => ({ value, label }))
  )

  const canWrite = $derived(
    hasPermissions(currentUserQuery.data, Permissions.usersWrite)
  )
  const canManage = $derived(
    canWrite && hasPermissions(currentUserQuery.data, Permissions.challsRead)
  )

  let sort = $state<SortState<AdminTeamSortBy>>({
    by: AdminTeamSortBy.CREATED_AT,
    order: SortOrder.DESC,
  })
  let statusFilter = $state<MultiFilter<TeamStatusValue>>(createFilter())
  let divisionFilter = $state<MultiFilter<DivisionOption>>(createFilter())
  let search = $state('')
  let debouncedSearch = $state('')

  $effect(() => {
    const next = search
    const timeout = setTimeout(() => (debouncedSearch = next), 400)
    return () => clearTimeout(timeout)
  })

  const filters = $derived<TeamFilters>({
    status: statusFilter,
    division: divisionFilter,
    search: debouncedSearch,
  })
  const hasActiveFilters = $derived(
    statusFilter.selected.length > 0 || divisionFilter.selected.length > 0
  )
  const shouldFetchRegistered = $derived(
    canWrite && registeredRowsMayMatch(statusFilter)
  )

  const families = [
    statusFilterFamily(statusFilter),
    divisionFilterFamily(divisionFilter, () => divisionOptions),
  ]
  function filterFor(family: ValueFilterFamily): MultiFilter<unknown> {
    return (
      family.id === 'status' ? statusFilter : divisionFilter
    ) as MultiFilter<unknown>
  }
  function clearAllFilters() {
    clearFilter(statusFilter)
    clearFilter(divisionFilter)
  }

  const usersQuery = useAdminUsersInfinite(
    () => teamQueryParams(filters, debouncedSearch, sort),
    () => shouldFetchRegistered
  )
  const verificationsQuery = useAdminUserVerifications(() => canWrite)

  const revealAfterLoading = usersQuery.isPending

  const registeredRows = $derived<TeamRow[]>(
    shouldFetchRegistered
      ? (usersQuery.data?.pages.flatMap(page => page.users) ?? []).map(
          team => ({
            kind: 'registered',
            team,
          })
        )
      : []
  )
  const pendingRows = $derived<TeamRow[]>(
    canWrite
      ? (verificationsQuery.data?.verifications ?? [])
          .filter(verification =>
            pendingVerificationMatchesFilters(verification, filters, divisions)
          )
          .map(verification => ({ kind: 'pending', verification }))
      : []
  )
  const rows = $derived(
    sortTeamRows([...registeredRows, ...pendingRows], sort.by, sort.order)
  )
  const fingerprint = $derived(teamFingerprint(sort, filters, debouncedSearch))

  const showError = $derived(
    (!!usersQuery.error && !usersQuery.data && shouldFetchRegistered) ||
      (!!verificationsQuery.error && !verificationsQuery.data)
  )
  const showLoading = $derived(
    !clientConfig ||
      (shouldFetchRegistered && usersQuery.isPending && !usersQuery.data) ||
      (canWrite && verificationsQuery.isPending && !verificationsQuery.data)
  )
  const errorMessage = $derived(
    usersQuery.error?.message ??
      verificationsQuery.error?.message ??
      'Something went wrong.'
  )

  const copyAction = createAsyncAction<string>()
  const updateAction = createAsyncAction<string>()
  const deleteAction = createAsyncAction<string>()
  const completeAction = createAsyncAction<string>()
  const resendAction = createAsyncAction<string>()
  const confirmState = createConfirmState()

  async function copyEmail(email: string) {
    await copyText(email, 'Email copied.')
  }

  function manage(id: string) {
    goto(`/admin/profile/${id}`)
  }

  async function mintToken(team: TeamRef) {
    await copyAction.run(
      async () => {
        const response = await apiRequest(CreateUserTokenRouteV2, {
          id: team.id,
        })
        if (response.kind === GoodCreateUserTokenV2.kind) {
          await copyText(
            response.data.token,
            `Login token copied for ${team.name}.`
          )
        } else {
          showApiError(response)
        }
      },
      {
        key: team.id,
        errorMessage: `Failed to create a login token for ${team.name}`,
      }
    )
  }

  function requestCopyToken(team: TeamRef) {
    confirmState.request({
      title: 'Copy login token',
      message:
        'This token grants full, non-expiring access to the account. Anyone with it can log in as this team until the account is deleted.',
      confirmLabel: 'Copy token',
      destructive: false,
      run: () => mintToken(team),
    })
  }

  async function setBanned(team: TeamRef, banned: boolean) {
    await updateAction.run(
      async () => {
        const response = await apiRequest(UpdateAdminUserRouteV2, {
          id: team.id,
          data: { banned },
        })
        if (response.kind === GoodAdminUserUpdateV2.kind) {
          toast.success(`${team.name} ${banned ? 'banned' : 'unbanned'}.`)
          invalidateAdminTeamQueries(queryClient)
        } else {
          showApiError(response)
        }
      },
      {
        key: team.id,
        errorMessage: `Failed to ${banned ? 'ban' : 'unban'} ${team.name}`,
      }
    )
  }

  function requestBan(team: BanRef) {
    if (team.banned) {
      setBanned(team, false)
      return
    }
    confirmState.request({
      title: 'Ban team',
      message:
        'Banning removes the team from the leaderboard but keeps the account and its solve history.',
      confirmLabel: 'Ban team',
      destructive: true,
      run: () => setBanned(team, true),
    })
  }

  async function deleteTeam(team: TeamRef) {
    await deleteAction.run(
      async () => {
        const response = await apiRequest(DeleteAdminUserRouteV2, {
          id: team.id,
        })
        if (response.kind === GoodAdminUserDeleteV2.kind) {
          toast.success(`${team.name} deleted.`)
          invalidateAdminTeamQueries(queryClient)
        } else {
          showApiError(response)
        }
      },
      { key: team.id, errorMessage: `Failed to delete ${team.name}` }
    )
  }

  function requestDelete(team: TeamRef) {
    confirmState.request({
      title: 'Delete team',
      message:
        'This removes the team and its solves from the database. This cannot be undone.',
      confirmLabel: 'Delete team',
      destructive: true,
      run: () => deleteTeam(team),
    })
  }

  async function verifyTeam(verification: TeamRef) {
    await completeAction.run(
      async () => {
        const response = await apiRequest(
          CompleteAdminUserVerificationRouteV2,
          {
            id: verification.id,
          }
        )
        if (response.kind === GoodAdminUserVerificationCompleteV2.kind) {
          toast.success(`${verification.name} verified.`)
          invalidateAdminTeamQueries(queryClient)
        } else {
          showApiError(response)
        }
      },
      {
        key: verification.id,
        errorMessage: `Failed to verify ${verification.name}`,
      }
    )
  }

  async function resendVerification(verification: TeamRef) {
    await resendAction.run(
      async () => {
        const response = await apiRequest(ResendAdminUserVerificationRouteV2, {
          id: verification.id,
        })
        if (response.kind === GoodAdminUserVerificationResendV2.kind) {
          toast.success(`Verification email resent to ${verification.name}.`)
          queryClient.invalidateQueries({
            queryKey: queryKeys.adminUserVerifications,
          })
        } else {
          showApiError(response)
        }
      },
      {
        key: verification.id,
        errorMessage: `Failed to resend verification for ${verification.name}`,
      }
    )
  }
</script>

<svelte:head>
  {#if clientConfig}
    <title>Teams | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

<teams-page>
  {#if !canWrite}
    <teams-status>
      <Card title="Team management unavailable">
        <p>
          Your account needs the manage-teams permission to view registered
          teams.
        </p>
      </Card>
    </teams-status>
  {:else if showLoading}
    <teams-status>
      <Spinner />
    </teams-status>
  {:else if showError}
    <teams-status>
      <Card title="Failed to load teams">
        <p>{errorMessage}</p>
      </Card>
    </teams-status>
  {:else}
    <teams-reveal data-reveal={revealAfterLoading || undefined}>
      <TeamsTable
        {rows}
        bind:sort
        bind:search
        {families}
        {filterFor}
        {hasActiveFilters}
        onClearAll={clearAllFilters}
        fetching={usersQuery.isFetching && !usersQuery.isFetchingNextPage}
        {fingerprint}
        {divisions}
        startTime={clientConfig?.startTime}
        hasNextPage={usersQuery.hasNextPage ?? false}
        isFetchingNextPage={usersQuery.isFetchingNextPage}
        onLoadMore={() => usersQuery.fetchNextPage()}
        {canManage}
        copyingId={copyAction.key}
        updatingId={updateAction.key}
        deletingId={deleteAction.key}
        completingId={completeAction.key}
        resendingId={resendAction.key}
        onCopyEmail={copyEmail}
        onManage={manage}
        onCopyToken={requestCopyToken}
        onBan={requestBan}
        onDelete={requestDelete}
        onResend={resendVerification}
        onVerify={verifyTeam}
      />
    </teams-reveal>
  {/if}
</teams-page>

<ConfirmDialog
  open={confirmState.current !== null}
  onOpenChange={(open: boolean) => {
    if (!open) confirmState.cancel()
  }}
  title={confirmState.current?.title ?? ''}
  message={confirmState.current?.message ?? ''}
  confirmLabel={confirmState.current?.confirmLabel ?? 'Confirm'}
  destructive={confirmState.current?.destructive ?? false}
  onConfirm={confirmState.confirm}
/>

<style>
  teams-reveal {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  teams-page {
    display: flex;
    flex-direction: column;
    min-block-size: 0;
    block-size: calc(100dvh - var(--header-height));
    max-block-size: calc(100dvh - var(--header-height));
    padding: 0 1rem 1rem;
    overflow: hidden;

    @media (width >= 48rem) {
      padding-inline: 2.25rem;
    }
  }

  teams-status {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: var(--space-l);

    :global(ui-card) {
      inline-size: 100%;
      max-inline-size: 28rem;
    }

    p {
      color: var(--foreground-l3);
    }
  }
</style>

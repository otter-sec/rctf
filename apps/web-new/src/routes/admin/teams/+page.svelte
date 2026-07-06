<!--
  Admin teams (/admin/teams). Merges the server-paged registered-team list with
  the client-filtered pending email-verification queue into one sortable table.
  Requires usersWrite for the data (a hint card shows without it); the admin
  layout already enforces challsRead. Search is debounced 400ms before it hits
  the server param, the pending-row predicate, and the scroll-reset fingerprint.
  The registered query is skipped entirely — its `enabled` gate and its rendered
  set both drop out — when the status filter can match no registered status
  (e.g. an include of only `unverified`). Mutations follow the app idiom:
  apiRequest + a per-row pending id + explicit invalidation via
  invalidateAdminTeamQueries (which also covers the verification queue).
-->
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
  import { clearFilter, createFilter, type MultiFilter } from '$lib/filters/core'
  import type { ValueFilterFamily } from '$lib/filters/ui'
  import {
    invalidateAdminTeamQueries,
    useAdminUsersInfinite,
    useAdminUserVerifications,
  } from '$lib/query/admin'
  import { useClientConfig } from '$lib/query/config'
  import { useCurrentUser } from '$lib/query/user'
  import { toast } from '$lib/toast'
  import Card from '$lib/ui/card.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { hasPermissions } from '$lib/utils/permissions'
  import type { SortState } from '../admin-table-logic'
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
  type ConfirmRequest = {
    title: string
    message: string
    confirmLabel: string
    destructive: boolean
    run: () => void
  }

  const queryClient = useQueryClient()
  const configQuery = useClientConfig()
  const currentUserQuery = useCurrentUser()

  const clientConfig = $derived(configQuery.data)
  const divisions = $derived<Record<string, string>>(clientConfig?.divisions ?? {})
  const divisionOptions = $derived<DivisionOption[]>(
    Object.entries(divisions).map(([value, label]) => ({ value, label }))
  )

  const canWrite = $derived(hasPermissions(currentUserQuery.data, Permissions.usersWrite))
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
  const shouldFetchRegistered = $derived(canWrite && registeredRowsMayMatch(statusFilter))

  const families = [
    statusFilterFamily(statusFilter),
    divisionFilterFamily(divisionFilter, () => divisionOptions),
  ]
  function filterFor(family: ValueFilterFamily): MultiFilter<unknown> {
    return (family.id === 'status' ? statusFilter : divisionFilter) as MultiFilter<unknown>
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

  const registeredRows = $derived<TeamRow[]>(
    shouldFetchRegistered
      ? (usersQuery.data?.pages.flatMap(page => page.users) ?? []).map(team => ({
          kind: 'registered',
          team,
        }))
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
  const rows = $derived(sortTeamRows([...registeredRows, ...pendingRows], sort.by, sort.order))
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
    usersQuery.error?.message ?? verificationsQuery.error?.message ?? 'Something went wrong.'
  )

  let copyingId = $state<string | null>(null)
  let updatingId = $state<string | null>(null)
  let deletingId = $state<string | null>(null)
  let completingId = $state<string | null>(null)
  let resendingId = $state<string | null>(null)
  let confirmRequest = $state<ConfirmRequest | null>(null)

  function runConfirm() {
    const request = confirmRequest
    confirmRequest = null
    request?.run()
  }

  async function copyEmail(email: string) {
    try {
      await navigator.clipboard.writeText(email)
      toast.success('Email copied.')
    } catch {
      toast.error('Failed to copy email.')
    }
  }

  function manage(id: string) {
    goto(`/admin/profile/${id}`)
  }

  async function mintToken(team: TeamRef) {
    copyingId = team.id
    try {
      const response = await apiRequest(CreateUserTokenRouteV2, { id: team.id })
      if (response.kind === GoodCreateUserTokenV2.kind) {
        try {
          await navigator.clipboard.writeText(response.data.token)
          toast.success(`Login token copied for ${team.name}.`)
        } catch {
          toast.error('Failed to copy token.')
        }
      } else {
        showApiError(response)
      }
    } finally {
      copyingId = null
    }
  }

  function requestCopyToken(team: TeamRef) {
    confirmRequest = {
      title: 'Copy login token',
      message:
        'This token grants full, non-expiring access to the account. Anyone with it can log in as this team until the account is deleted.',
      confirmLabel: 'Copy token',
      destructive: false,
      run: () => mintToken(team),
    }
  }

  async function setBanned(team: TeamRef, banned: boolean) {
    updatingId = team.id
    try {
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
    } finally {
      updatingId = null
    }
  }

  function requestBan(team: BanRef) {
    if (team.banned) {
      setBanned(team, false)
      return
    }
    confirmRequest = {
      title: 'Ban team',
      message:
        'Banning removes the team from the leaderboard but keeps the account and its solve history.',
      confirmLabel: 'Ban team',
      destructive: true,
      run: () => setBanned(team, true),
    }
  }

  async function deleteTeam(team: TeamRef) {
    deletingId = team.id
    try {
      const response = await apiRequest(DeleteAdminUserRouteV2, { id: team.id })
      if (response.kind === GoodAdminUserDeleteV2.kind) {
        toast.success(`${team.name} deleted.`)
        invalidateAdminTeamQueries(queryClient)
      } else {
        showApiError(response)
      }
    } finally {
      deletingId = null
    }
  }

  function requestDelete(team: TeamRef) {
    confirmRequest = {
      title: 'Delete team',
      message: 'This removes the team and its solves from the database. This cannot be undone.',
      confirmLabel: 'Delete team',
      destructive: true,
      run: () => deleteTeam(team),
    }
  }

  async function verifyTeam(verification: TeamRef) {
    completingId = verification.id
    try {
      const response = await apiRequest(CompleteAdminUserVerificationRouteV2, {
        id: verification.id,
      })
      if (response.kind === GoodAdminUserVerificationCompleteV2.kind) {
        toast.success(`${verification.name} verified.`)
        invalidateAdminTeamQueries(queryClient)
      } else {
        showApiError(response)
      }
    } finally {
      completingId = null
    }
  }

  async function resendVerification(verification: TeamRef) {
    resendingId = verification.id
    try {
      const response = await apiRequest(ResendAdminUserVerificationRouteV2, {
        id: verification.id,
      })
      if (response.kind === GoodAdminUserVerificationResendV2.kind) {
        toast.success(`Verification email resent to ${verification.name}.`)
        invalidateAdminTeamQueries(queryClient)
      } else {
        showApiError(response)
      }
    } finally {
      resendingId = null
    }
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
        <p>Your account needs the manage-teams permission to view registered teams.</p>
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
      {copyingId}
      {updatingId}
      {deletingId}
      {completingId}
      {resendingId}
      onCopyEmail={copyEmail}
      onManage={manage}
      onCopyToken={requestCopyToken}
      onBan={requestBan}
      onDelete={requestDelete}
      onResend={resendVerification}
      onVerify={verifyTeam}
    />
  {/if}
</teams-page>

<ConfirmDialog
  open={confirmRequest !== null}
  onOpenChange={(open: boolean) => {
    if (!open) confirmRequest = null
  }}
  title={confirmRequest?.title ?? ''}
  message={confirmRequest?.message ?? ''}
  confirmLabel={confirmRequest?.confirmLabel ?? 'Confirm'}
  destructive={confirmRequest?.destructive ?? false}
  onConfirm={runConfirm}
/>

<style>
  teams-page {
    display: flex;
    flex-direction: column;
    min-block-size: 0;
    block-size: calc(100dvh - var(--header-height));
    max-block-size: calc(100dvh - var(--header-height));
    padding: 0 var(--space-m) var(--space-m);
    overflow: hidden;
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

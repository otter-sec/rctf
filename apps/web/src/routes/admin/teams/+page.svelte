<script lang="ts">
  import {
    AdminTeamSortBy,
    GoodAdminUserDeleteV2,
    GoodAdminUserUpdateV2,
    GoodAdminUserVerificationCompleteV2,
    GoodAdminUserVerificationResendV2,
    GoodChallengeSolveDeleteV2,
    GoodCreateUserTokenV2,
    Permissions,
    SortOrder,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { showApiError } from '$lib/api'
  import { Card, Spinner } from '$lib/components'
  import {
    queryKeys,
    useAdminUser,
    useAdminUserVerifications,
    useClientConfig,
    useCompleteAdminUserVerificationMutation,
    useCreateUserTokenMutation,
    useCurrentUser,
    useDeleteAdminUserMutation,
    useDeleteChallengeSolveMutation,
    useInfiniteAdminUsers,
    useResendAdminUserVerificationMutation,
    useUpdateAdminUserMutation,
  } from '$lib/query'
  import { hasPermissions } from '$lib/utils'
  import { toast } from 'svelte-sonner'
  import TeamConfirmDialogs from './team-confirm-dialogs.svelte'
  import TeamManageDialog from './team-manage-dialog.svelte'
  import {
    createTeamFilters,
    PAGE_SIZE,
    pendingVerificationMatchesFilters,
    registeredRowsMayMatch,
    sortTeamRows,
    teamFilterParams,
    type AdminTeam,
    type AdminTeamDetails,
    type PendingTeamRow,
    type PendingVerification,
    type RegisteredTeamRow,
    type SortBy,
  } from './teams-model'
  import TeamsTable from './teams-table.svelte'

  let sortBy = $state<SortBy>(AdminTeamSortBy.CREATED_AT)
  let sortOrder = $state<SortOrder>(SortOrder.DESC)
  let filters = $state(createTeamFilters())
  let debouncedSearch = $state('')

  const clientConfigQuery = useClientConfig()
  const queryClient = useQueryClient()
  const clientConfig = $derived(clientConfigQuery.data)
  const userQuery = useCurrentUser()
  const user = $derived(userQuery.data)
  const hasWritePerms = $derived(hasPermissions(user, Permissions.usersWrite))
  const hasSolveWritePerms = $derived(hasPermissions(user, Permissions.challsSolveWrite))
  const hasTeamDetailsPerms = $derived(
    hasWritePerms && hasPermissions(user, Permissions.challsRead)
  )
  const shouldFetchRegisteredRows = $derived(registeredRowsMayMatch(filters.status))
  const queryFilters = $derived({
    ...filters,
    search: debouncedSearch,
  })
  const divisionOptions = $derived(
    Object.entries(clientConfig?.divisions ?? {}).map(([value, label]) => ({
      value,
      label,
    }))
  )

  $effect(() => {
    const search = filters.search
    const timeout = setTimeout(() => {
      debouncedSearch = search
    }, 400)

    return () => clearTimeout(timeout)
  })

  const usersQuery = useInfiniteAdminUsers(
    () => PAGE_SIZE,
    () => teamFilterParams(queryFilters, sortBy, sortOrder),
    () => shouldFetchRegisteredRows
  )
  const allTeams = $derived(
    shouldFetchRegisteredRows
      ? ((usersQuery.data?.pages.flatMap(page => page.users) ?? []) as AdminTeam[])
      : []
  )
  const pendingVerificationsQuery = useAdminUserVerifications(() => hasWritePerms)
  const pendingVerifications = $derived(
    (pendingVerificationsQuery.data?.verifications ?? []) as PendingVerification[]
  )
  const pendingRows = $derived.by(() =>
    hasWritePerms
      ? pendingVerifications
          .filter(verification =>
            pendingVerificationMatchesFilters(verification, queryFilters, clientConfig?.divisions)
          )
          .map(verification => ({ kind: 'pending', verification }) satisfies PendingTeamRow)
      : []
  )
  const tableRows = $derived.by(() =>
    sortTeamRows(
      [
        ...allTeams.map(team => ({ kind: 'registered', team }) satisfies RegisteredTeamRow),
        ...pendingRows,
      ],
      sortBy,
      sortOrder
    )
  )
  const showQueryError = $derived(!!usersQuery.error && !usersQuery.data)
  const showInitialLoading = $derived(
    (usersQuery.isPending && shouldFetchRegisteredRows && !usersQuery.data) ||
      (pendingVerificationsQuery.isPending && hasWritePerms && !usersQuery.data)
  )

  const createTokenMutation = useCreateUserTokenMutation()
  const updateUserMutation = useUpdateAdminUserMutation()
  const deleteUserMutation = useDeleteAdminUserMutation()
  const deleteSolveMutation = useDeleteChallengeSolveMutation()
  const completeVerificationMutation = useCompleteAdminUserVerificationMutation()
  const resendVerificationMutation = useResendAdminUserVerificationMutation()

  let copyingTeamId = $state<string | null>(null)
  let updatingTeamId = $state<string | null>(null)
  let deletingTeamId = $state<string | null>(null)
  let revokingSolveKey = $state<string | null>(null)
  let completingVerificationId = $state<string | null>(null)
  let resendingVerificationId = $state<string | null>(null)
  let selectedTeamId = $state<string | null>(null)
  let banDialogTeam = $state<{
    id: string
    name: string
    banned: boolean
  } | null>(null)
  let deleteDialogTeam = $state<{ id: string; name: string } | null>(null)
  const selectedTeamQuery = useAdminUser(() => selectedTeamId)
  const selectedTeam = $derived(selectedTeamQuery.data as AdminTeamDetails | undefined)

  function refreshTeamQueries(teamId?: string) {
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    if (teamId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUser(teamId) })
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.fullLeaderboard })
    queryClient.invalidateQueries({ queryKey: queryKeys.leaderboardChallenges })
  }

  function refreshVerificationQueries() {
    queryClient.invalidateQueries({
      queryKey: queryKeys.adminUserVerifications,
    })
    refreshTeamQueries()
  }

  async function handleCopyToken(team: { id: string; name: string }) {
    copyingTeamId = team.id
    createTokenMutation.mutate(
      { id: team.id },
      {
        onSuccess: async response => {
          if (response.kind === GoodCreateUserTokenV2.kind) {
            try {
              await navigator.clipboard.writeText(response.data.token)
              toast.success(`Token copied for ${team.name}`)
            } catch {
              toast.error('Failed to copy token')
            }
          } else {
            showApiError(response)
          }
          copyingTeamId = null
        },
        onError: err => {
          toast.error(err.message)
          copyingTeamId = null
        },
      }
    )
  }

  function openManageTeam(teamId: string) {
    selectedTeamId = teamId
  }

  function closeManageTeam() {
    selectedTeamId = null
  }

  function openBanDialog(team: { id: string; name: string; banned: boolean }) {
    if (selectedTeamId === team.id) {
      closeManageTeam()
    }
    banDialogTeam = team
  }

  function closeBanDialog() {
    banDialogTeam = null
  }

  function handleBanAction(team: { id: string; name: string; banned: boolean }) {
    if (team.banned) {
      handleToggleBan(team)
      return
    }

    openBanDialog(team)
  }

  function handleToggleBan(
    team: { id: string; name: string; banned: boolean },
    onSuccess?: () => void
  ) {
    updatingTeamId = team.id
    updateUserMutation.mutate(
      {
        id: team.id,
        data: {
          banned: !team.banned,
        },
      },
      {
        onSuccess: response => {
          if (response.kind === GoodAdminUserUpdateV2.kind) {
            toast.success(`${team.name} ${team.banned ? 'unbanned' : 'banned'}`)
            refreshTeamQueries(team.id)
            onSuccess?.()
          } else {
            showApiError(response)
          }
          updatingTeamId = null
        },
        onError: err => {
          toast.error(err.message)
          updatingTeamId = null
        },
      }
    )
  }

  function handleConfirmBan() {
    if (!banDialogTeam) return
    handleToggleBan(banDialogTeam, closeBanDialog)
  }

  function openDeleteDialog(team: { id: string; name: string }) {
    if (selectedTeamId === team.id) {
      closeManageTeam()
    }
    deleteDialogTeam = team
  }

  function closeDeleteDialog() {
    deleteDialogTeam = null
  }

  function handleDeleteTeam() {
    if (!deleteDialogTeam) return

    const team = deleteDialogTeam
    deletingTeamId = team.id
    deleteUserMutation.mutate(
      { id: team.id },
      {
        onSuccess: response => {
          if (response.kind === GoodAdminUserDeleteV2.kind) {
            toast.success(`${team.name} deleted`)
            refreshTeamQueries(team.id)
            if (selectedTeamId === team.id) closeManageTeam()
            closeDeleteDialog()
          } else {
            showApiError(response)
          }
          deletingTeamId = null
        },
        onError: err => {
          toast.error(err.message)
          deletingTeamId = null
        },
      }
    )
  }

  function handleRevokeSolve(solve: { challengeId: string; challengeName: string }) {
    if (!selectedTeam) return

    const teamId = selectedTeam.id
    const key = `${teamId}:${solve.challengeId}`
    revokingSolveKey = key
    deleteSolveMutation.mutate(
      { challengeId: solve.challengeId, userId: teamId },
      {
        onSuccess: response => {
          if (response.kind === GoodChallengeSolveDeleteV2.kind) {
            toast.success(`Solve revoked for ${solve.challengeName}`)
            refreshTeamQueries(teamId)
          } else {
            showApiError(response)
          }
          revokingSolveKey = null
        },
        onError: err => {
          toast.error(err.message)
          revokingSolveKey = null
        },
      }
    )
  }

  function handleCompleteVerification(verification: { id: string; name: string }) {
    completingVerificationId = verification.id
    completeVerificationMutation.mutate(
      { id: verification.id },
      {
        onSuccess: response => {
          if (response.kind === GoodAdminUserVerificationCompleteV2.kind) {
            toast.success(`${verification.name} verified`)
            refreshVerificationQueries()
          } else {
            showApiError(response)
          }
          completingVerificationId = null
        },
        onError: err => {
          toast.error(err.message)
          completingVerificationId = null
        },
      }
    )
  }

  function handleResendVerification(verification: { id: string; name: string }) {
    resendingVerificationId = verification.id
    resendVerificationMutation.mutate(
      { id: verification.id },
      {
        onSuccess: response => {
          if (response.kind === GoodAdminUserVerificationResendV2.kind) {
            toast.success(`Verification email resent to ${verification.name}`)
            queryClient.invalidateQueries({
              queryKey: queryKeys.adminUserVerifications,
            })
          } else {
            showApiError(response)
          }
          resendingVerificationId = null
        },
        onError: err => {
          toast.error(err.message)
          resendingVerificationId = null
        },
      }
    )
  }

  async function copyEmail(email: string) {
    try {
      await navigator.clipboard.writeText(email)
      toast.success('Email copied')
    } catch {
      toast.error('Failed to copy email')
    }
  }
</script>

<svelte:head>
  {#if clientConfig}
    <title>Teams | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

<div class="flex h-[calc(100dvh-72px)] w-full flex-col overflow-hidden px-4 pt-0 pb-4 md:px-9">
  <div class="min-h-0 flex-1">
    {#if showInitialLoading}
      <div class="flex h-full items-center justify-center">
        <Spinner class="size-6" />
      </div>
    {:else if pendingVerificationsQuery.error && !usersQuery.data}
      <div class="flex h-full items-center justify-center">
        <Card.Root class="max-w-md">
          <Card.Header>
            <Card.Title>Error</Card.Title>
          </Card.Header>
          <Card.Content>
            <p class="text-foreground-l3">{pendingVerificationsQuery.error.message}</p>
          </Card.Content>
        </Card.Root>
      </div>
    {:else if showQueryError}
      <div class="flex h-full items-center justify-center">
        <Card.Root class="max-w-md">
          <Card.Header>
            <Card.Title>Error</Card.Title>
          </Card.Header>
          <Card.Content>
            <p class="text-foreground-l3">{usersQuery.error?.message}</p>
          </Card.Content>
        </Card.Root>
      </div>
    {:else}
      <TeamsTable
        rows={tableRows}
        bind:filters
        bind:sortBy
        bind:sortOrder
        {clientConfig}
        {divisionOptions}
        {shouldFetchRegisteredRows}
        hasNextPage={usersQuery.hasNextPage ?? false}
        isFetching={usersQuery.isFetching && !usersQuery.isFetchingNextPage}
        isFetchingNextPage={usersQuery.isFetchingNextPage}
        {hasWritePerms}
        {hasTeamDetailsPerms}
        {copyingTeamId}
        {updatingTeamId}
        {deletingTeamId}
        {completingVerificationId}
        {resendingVerificationId}
        onLoadMore={() => usersQuery.fetchNextPage()}
        onCopyEmail={copyEmail}
        onCopyToken={handleCopyToken}
        onManageTeam={openManageTeam}
        onBanAction={handleBanAction}
        onDeleteTeam={openDeleteDialog}
        onCompleteVerification={handleCompleteVerification}
        onResendVerification={handleResendVerification}
      />
    {/if}
  </div>
</div>

<TeamManageDialog
  open={selectedTeamId !== null}
  {selectedTeam}
  isPending={selectedTeamQuery.isPending}
  errorMessage={selectedTeamQuery.error?.message}
  {hasWritePerms}
  {hasSolveWritePerms}
  {updatingTeamId}
  {deletingTeamId}
  {revokingSolveKey}
  onClose={closeManageTeam}
  onBanAction={handleBanAction}
  onDeleteTeam={openDeleteDialog}
  onRevokeSolve={handleRevokeSolve}
/>

<TeamConfirmDialogs
  {banDialogTeam}
  {deleteDialogTeam}
  {updatingTeamId}
  {deletingTeamId}
  onCloseBan={closeBanDialog}
  onConfirmBan={handleConfirmBan}
  onCloseDelete={closeDeleteDialog}
  onConfirmDelete={handleDeleteTeam}
/>

<script lang="ts">
  import {
    AdminTeamSortBy,
    AdminTeamSortOrder,
    AdminTeamStatus,
    GoodAdminUserDeleteV2,
    GoodAdminUserUpdateV2,
    GoodAdminUserVerificationCompleteV2,
    GoodAdminUserVerificationResendV2,
    GoodChallengeSolveDeleteV2,
    GoodCreateUserTokenV2,
    Permissions,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { showApiError } from '$lib/api'
  import {
    Avatar,
    Button,
    Card,
    Dialog,
    Drawer,
    DropdownMenu,
    EmptyState,
    ScrollArea,
    Spinner,
    Tooltip,
    VirtualList,
  } from '$lib/components'
  import {
    IconCheck,
    IconChevronDown,
    IconChevronRight,
    IconChevronUp,
    IconCopy,
    IconFilter,
    IconMoodX,
    IconSearch,
    IconSelector,
    IconSend,
    IconShieldFilled,
    IconTrashFilled,
    IconTrophyFilled,
    IconUserCog,
    IconUsersGroup,
    IconX,
  } from '$lib/icons'
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
  import {
    cn,
    formatRelativeHoursMinutes,
    formatLocalTime,
    getInitials,
    hasPermissions,
    useInfiniteVirtualScroll,
  } from '$lib/utils'
  import { toast } from 'svelte-sonner'

  type PendingVerification = {
    id: string
    name: string
    email: string
    division: string
    createdAt: number
    expiresAt: number
  }

  type AdminTeam = {
    id: string
    name: string
    email: string | null
    division: string
    perms: number
    banned: boolean
    score: number
    solveCount: number
    avatarUrl: string | null
    countryCode: string | null
    statusText: string | null
    createdAt: string
  }
  type SortBy = AdminTeamSortBy
  type SortOrder = AdminTeamSortOrder
  type FilterMode = 'include' | 'exclude'
  type TeamStatusFilter = AdminTeamStatus | typeof UNVERIFIED_TEAM_STATUS
  type TeamDisplayStatus = TeamStatusFilter
  type MultiFilter<T> = {
    mode: FilterMode
    selected: T[]
  }
  type DivisionFilterOption = {
    value: string
    label: string
  }
  type TeamFilters = {
    search: string
    status: MultiFilter<TeamStatusFilter>
    division: MultiFilter<DivisionFilterOption>
  }
  type TeamQueryParams = {
    search?: string
    sortBy: AdminTeamSortBy
    sortOrder: AdminTeamSortOrder
    statuses?: string
    excludeStatuses?: string
    divisions?: string
    excludeDivisions?: string
  }
  type RegisteredTeamRow = { kind: 'registered'; team: AdminTeam }
  type PendingTeamRow = { kind: 'pending'; verification: PendingVerification }
  type TeamRow = RegisteredTeamRow | PendingTeamRow
  type MobileTeamFilterId = 'status' | 'division'

  const PAGE_SIZE = 100
  const ROW_HEIGHT = 48
  const UNVERIFIED_TEAM_STATUS = 'unverified' as const
  const TEAM_STATUS_FILTERS = [
    AdminTeamStatus.ACTIVE,
    AdminTeamStatus.BANNED,
    AdminTeamStatus.ADMIN,
    UNVERIFIED_TEAM_STATUS,
  ] as const

  let sortBy = $state<SortBy>(AdminTeamSortBy.CREATED_AT)
  let sortOrder = $state<SortOrder>(AdminTeamSortOrder.DESC)
  let filters = $state(createTeamFilters())
  let tableHeaderRef = $state<HTMLElement | null>(null)
  let listScrollMargin = $state(0)
  let tableViewportWidth = $state(0)
  let innerWidth = $state(0)
  let filterDrawerOpen = $state(false)
  let mobileActiveFilterId = $state<MobileTeamFilterId | null>(null)

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
  const hasFilters = $derived(hasTeamFilters(filters))
  const queryFingerprint = $derived(`${sortBy}:${sortOrder}:${teamFilterFingerprint(filters)}`)
  const shouldFetchRegisteredRows = $derived(registeredRowsMayMatch(filters.status))
  const divisionOptions = $derived(
    Object.entries(clientConfig?.divisions ?? {}).map(([value, label]) => ({
      value,
      label,
    }))
  )

  const usersQuery = useInfiniteAdminUsers(
    () => PAGE_SIZE,
    () => teamFilterParams(filters, sortBy, sortOrder),
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
  const showQueryError = $derived(!!usersQuery.error && !usersQuery.data)
  const showInitialLoading = $derived(
    (usersQuery.isPending && shouldFetchRegisteredRows) ||
      (pendingVerificationsQuery.isPending && hasWritePerms && !usersQuery.data)
  )
  const pendingRows = $derived.by(() =>
    hasWritePerms
      ? pendingVerifications
          .filter(pendingVerificationMatchesFilters)
          .map(verification => ({ kind: 'pending', verification }) satisfies PendingTeamRow)
      : []
  )
  const tableRows = $derived.by(() =>
    sortTeamRows([
      ...allTeams.map(team => ({ kind: 'registered', team }) satisfies RegisteredTeamRow),
      ...pendingRows,
    ])
  )
  const pinnedToolbarWidth = $derived(tableViewportWidth ? `${tableViewportWidth}px` : '100%')
  const isMobileFilterMenu = $derived(innerWidth > 0 && innerWidth < 768)
  const mobileDrawerTitle = $derived(
    mobileActiveFilterId === 'status'
      ? 'Status'
      : mobileActiveFilterId === 'division'
        ? 'Division'
        : 'Filters'
  )

  const scroll = useInfiniteVirtualScroll({
    rowHeight: ROW_HEIGHT,
    overscan: 12,
    onLoadMore: () => usersQuery.fetchNextPage(),
  })

  $effect(() => {
    const hasNextRegisteredPage = shouldFetchRegisteredRows && (usersQuery.hasNextPage ?? false)
    scroll.state.count = tableRows.length + (hasNextRegisteredPage ? 1 : 0)
    scroll.state.hasNextPage = hasNextRegisteredPage
    scroll.state.isFetching = usersQuery.isFetchingNextPage
    scroll.state.scrollMargin = listScrollMargin
  })

  $effect(() => {
    const header = tableHeaderRef
    if (!header) {
      listScrollMargin = 0
      return
    }

    const resizeObserver = new ResizeObserver(entries => {
      listScrollMargin = Math.round(entries[0]?.contentRect.height ?? 0)
    })
    resizeObserver.observe(header)
    listScrollMargin = Math.round(header.getBoundingClientRect().height)

    return () => resizeObserver.disconnect()
  })

  $effect(() => {
    const viewport = scroll.state.viewportRef
    if (!viewport) {
      tableViewportWidth = 0
      return
    }

    const resizeObserver = new ResizeObserver(entries => {
      tableViewportWidth = Math.round(entries[0]?.contentRect.width ?? 0)
    })
    resizeObserver.observe(viewport)
    tableViewportWidth = Math.round(viewport.getBoundingClientRect().width)

    return () => resizeObserver.disconnect()
  })

  $effect(() => {
    queryFingerprint
    const viewport = scroll.state.viewportRef
    if (viewport) viewport.scrollTop = 0
  })

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
  const selectedTeam = $derived(selectedTeamQuery.data)

  function createFilter<T>(): MultiFilter<T> {
    return {
      mode: 'include',
      selected: [],
    }
  }

  function createTeamFilters(): TeamFilters {
    return {
      search: '',
      status: createFilter<TeamStatusFilter>(),
      division: createFilter<DivisionFilterOption>(),
    }
  }

  function hasTeamFilters(currentFilters: TeamFilters) {
    return (
      currentFilters.search.trim().length > 0 ||
      currentFilters.status.selected.length > 0 ||
      currentFilters.division.selected.length > 0
    )
  }

  function clearFilter<T>(filter: MultiFilter<T>) {
    filter.mode = 'include'
    filter.selected = []
  }

  function clearTeamFilters(currentFilters: TeamFilters) {
    currentFilters.search = ''
    clearFilter(currentFilters.status)
    clearFilter(currentFilters.division)
  }

  function setFilterMode<T>(filter: MultiFilter<T>, mode: FilterMode) {
    filter.mode = mode
  }

  function toggleFilterOption<T>(
    filter: MultiFilter<T>,
    option: T,
    keyFor: (option: T) => string
  ) {
    const key = keyFor(option)
    filter.selected = filter.selected.some(current => keyFor(current) === key)
      ? filter.selected.filter(current => keyFor(current) !== key)
      : [...filter.selected, option]
  }

  function filterOperatorLabel(mode: FilterMode, count: number) {
    if (mode === 'exclude') return 'is not'
    return count > 1 ? 'is any of' : 'is'
  }

  function filterFingerprint<T>(filter: MultiFilter<T>, keyFor: (option: T) => string) {
    return `${filter.mode}:${filter.selected.map(keyFor).sort().join(',')}`
  }

  function teamFilterFingerprint(currentFilters: TeamFilters) {
    return [
      currentFilters.search.trim(),
      filterFingerprint(currentFilters.status, status => status),
      filterFingerprint(currentFilters.division, division => division.value),
    ].join(':')
  }

  function isRegisteredStatus(status: TeamStatusFilter): status is AdminTeamStatus {
    return status !== UNVERIFIED_TEAM_STATUS
  }

  function selectedRegisteredStatuses(statusFilter: MultiFilter<TeamStatusFilter>) {
    return statusFilter.selected.filter(isRegisteredStatus)
  }

  function registeredRowsMayMatch(statusFilter: MultiFilter<TeamStatusFilter>) {
    if (statusFilter.selected.length === 0) return true

    const registeredStatuses = selectedRegisteredStatuses(statusFilter)
    if (statusFilter.mode === 'include') return registeredStatuses.length > 0

    const excludedStatuses = new Set(registeredStatuses)
    return Object.values(AdminTeamStatus).some(status => !excludedStatuses.has(status))
  }

  function addQueryFilter<T>(
    params: TeamQueryParams,
    filter: MultiFilter<T>,
    includeKey: 'statuses' | 'divisions',
    excludeKey: 'excludeStatuses' | 'excludeDivisions',
    keyFor: (option: T) => string
  ) {
    if (filter.selected.length === 0) return

    const value = filter.selected.map(keyFor).join(',')
    if (filter.mode === 'exclude') {
      params[excludeKey] = value
    } else {
      params[includeKey] = value
    }
  }

  function teamFilterParams(
    currentFilters: TeamFilters,
    nextSortBy: AdminTeamSortBy,
    nextSortOrder: AdminTeamSortOrder
  ): TeamQueryParams {
    const params: TeamQueryParams = {
      sortBy: nextSortBy,
      sortOrder: nextSortOrder,
    }
    const search = currentFilters.search.trim()
    const registeredStatuses = selectedRegisteredStatuses(currentFilters.status)

    if (search) params.search = search
    addQueryFilter(
      params,
      { mode: currentFilters.status.mode, selected: registeredStatuses },
      'statuses',
      'excludeStatuses',
      status => status
    )
    addQueryFilter(
      params,
      currentFilters.division,
      'divisions',
      'excludeDivisions',
      division => division.value
    )

    return params
  }

  function defaultSortOrder(nextSortBy: SortBy): SortOrder {
    switch (nextSortBy) {
      case AdminTeamSortBy.SCORE:
      case AdminTeamSortBy.SOLVES:
      case AdminTeamSortBy.CREATED_AT:
        return AdminTeamSortOrder.DESC
      default:
        return AdminTeamSortOrder.ASC
    }
  }

  function teamStatus(team: Pick<AdminTeam, 'banned' | 'perms'>) {
    if (team.perms > 0) return AdminTeamStatus.ADMIN
    if (team.banned) return AdminTeamStatus.BANNED
    return AdminTeamStatus.ACTIVE
  }

  function teamStatusLabel(status: TeamDisplayStatus | string) {
    switch (status) {
      case AdminTeamStatus.ACTIVE:
        return 'Active'
      case AdminTeamStatus.BANNED:
        return 'Banned'
      case AdminTeamStatus.ADMIN:
        return 'Admin'
      case UNVERIFIED_TEAM_STATUS:
        return 'Unverified'
      default:
        return status
    }
  }

  function statusTone(status: TeamDisplayStatus) {
    switch (status) {
      case AdminTeamStatus.ACTIVE:
        return 'success'
      case AdminTeamStatus.ADMIN:
        return 'accent'
      case AdminTeamStatus.BANNED:
        return 'danger'
      case UNVERIFIED_TEAM_STATUS:
        return 'warning'
    }
  }

  function pendingVerificationMatchesFilters(verification: PendingVerification) {
    if (filters.status.selected.length > 0) {
      const selected = filters.status.selected.includes(UNVERIFIED_TEAM_STATUS)
      if (filters.status.mode === 'include' ? !selected : selected) return false
    }

    if (filters.division.selected.length > 0) {
      const selected = filters.division.selected.some(
        division => division.value === verification.division
      )
      if (filters.division.mode === 'include' ? !selected : selected) return false
    }

    const search = filters.search.trim().toLowerCase()
    if (!search) return true

    const divisionLabel = clientConfig?.divisions[verification.division] ?? verification.division
    return [verification.name, verification.email, verification.division, divisionLabel, 'unverified']
      .filter(Boolean)
      .some(value => value.toLowerCase().includes(search))
  }

  function teamRowName(row: TeamRow) {
    return row.kind === 'registered' ? row.team.name : row.verification.name
  }

  function teamRowEmail(row: TeamRow) {
    return row.kind === 'registered' ? row.team.email : row.verification.email
  }

  function teamRowDivision(row: TeamRow) {
    return row.kind === 'registered' ? row.team.division : row.verification.division
  }

  function teamRowStatus(row: TeamRow): TeamDisplayStatus {
    return row.kind === 'registered' ? teamStatus(row.team) : UNVERIFIED_TEAM_STATUS
  }

  function teamRowCreatedAt(row: TeamRow) {
    return row.kind === 'registered'
      ? new Date(row.team.createdAt).getTime()
      : row.verification.createdAt
  }

  function sortTeamRows(rows: TeamRow[]) {
    const direction = sortOrder === AdminTeamSortOrder.ASC ? 1 : -1

    return [...rows].sort((a, b) => {
      const result = compareTeamRows(a, b)
      if (result !== 0) return result * direction
      return teamRowName(a).localeCompare(teamRowName(b))
    })
  }

  function compareTeamRows(a: TeamRow, b: TeamRow) {
    switch (sortBy) {
      case AdminTeamSortBy.TEAM:
        return teamRowName(a).localeCompare(teamRowName(b))
      case AdminTeamSortBy.EMAIL:
        return (teamRowEmail(a) ?? '').localeCompare(teamRowEmail(b) ?? '')
      case AdminTeamSortBy.DIVISION:
        return teamRowDivision(a).localeCompare(teamRowDivision(b))
      case AdminTeamSortBy.STATUS:
        return teamStatusLabel(teamRowStatus(a)).localeCompare(teamStatusLabel(teamRowStatus(b)))
      case AdminTeamSortBy.SCORE:
        return rowScore(a) - rowScore(b)
      case AdminTeamSortBy.SOLVES:
        return rowSolves(a) - rowSolves(b)
      case AdminTeamSortBy.CREATED_AT:
        return teamRowCreatedAt(a) - teamRowCreatedAt(b)
    }
  }

  function rowScore(row: TeamRow) {
    return row.kind === 'registered' ? row.team.score : -1
  }

  function rowSolves(row: TeamRow) {
    return row.kind === 'registered' ? row.team.solveCount : -1
  }

  function setSort(nextSortBy: SortBy) {
    if (sortBy === nextSortBy) {
      sortOrder =
        sortOrder === AdminTeamSortOrder.ASC ? AdminTeamSortOrder.DESC : AdminTeamSortOrder.ASC
      return
    }

    sortBy = nextSortBy
    sortOrder = defaultSortOrder(nextSortBy)
  }

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

  function updateSearch(value: string) {
    filters.search = value
  }

  function toggleStatus(status: TeamStatusFilter) {
    toggleFilterOption(filters.status, status, item => item)
  }

  function toggleDivision(division: DivisionFilterOption) {
    toggleFilterOption(filters.division, division, item => item.value)
  }

  function clearFilters() {
    clearTeamFilters(filters)
  }

  function openMobileFilterDrawer() {
    mobileActiveFilterId = null
    filterDrawerOpen = true
  }

  function closeMobileFilterDrawer() {
    filterDrawerOpen = false
    mobileActiveFilterId = null
  }

  function selectedCountLabel(label: string, count: number) {
    return `${count} ${label}${count === 1 ? '' : label.endsWith('s') ? 'es' : 's'}`
  }

  function statusFilterSummary() {
    const selected = filters.status.selected[0]
    if (filters.status.selected.length === 0) return ''
    if (filters.status.selected.length === 1 && selected) return teamStatusLabel(selected)
    return selectedCountLabel('status', filters.status.selected.length)
  }

  function divisionFilterSummary() {
    const selected = filters.division.selected[0]
    if (filters.division.selected.length === 0) return ''
    if (filters.division.selected.length === 1 && selected) return selected.label
    return selectedCountLabel('division', filters.division.selected.length)
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

  function formatCtfOffset(timestamp: number) {
    if (clientConfig?.startTime === null || clientConfig?.startTime === undefined) return ''
    return `T${formatRelativeHoursMinutes(timestamp, clientConfig.startTime)}`
  }

  function rowTime(row: TeamRow) {
    return row.kind === 'registered'
      ? new Date(row.team.createdAt).getTime()
      : row.verification.expiresAt
  }
</script>

{#snippet sortIndicator(column: SortBy)}
  {#if sortBy === column}
    {#if sortOrder === AdminTeamSortOrder.ASC}
      <IconChevronUp class="size-4" />
    {:else}
      <IconChevronDown class="size-4" />
    {/if}
  {:else}
    <IconSelector class="text-foreground-l4 size-4" />
  {/if}
{/snippet}

{#snippet sortHeader(column: SortBy, label: string)}
  <button
    type="button"
    class="hover:text-foreground-l0 flex w-full items-center gap-1 px-3 py-2 text-left whitespace-nowrap"
    onclick={() => setSort(column)}
  >
    <span class="truncate">{label}</span>
    {@render sortIndicator(column)}
  </button>
{/snippet}

{#snippet operatorDropdown(
  mode: 'include' | 'exclude',
  count: number,
  onSelect: (mode: 'include' | 'exclude') => void
)}
  <DropdownMenu.Root>
    <DropdownMenu.Trigger
      class="text-foreground-l4 hover:bg-background-l3 hover:text-foreground-l2 flex h-full items-center gap-1 border-r-2 px-2 transition-colors"
    >
      {filterOperatorLabel(mode, count)}
      <IconChevronDown class="size-3" />
    </DropdownMenu.Trigger>
    <DropdownMenu.Content
      align="start"
      class="bg-background-l4 border-foreground-l4/40 z-[120] w-36 border-2 shadow-xl"
    >
      <DropdownMenu.Item
        class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2"
        onclick={() => onSelect('include')}
      >
        <IconCheck class={cn('size-4', mode !== 'include' && 'text-transparent')} />
        {count > 1 ? 'is any of' : 'is'}
      </DropdownMenu.Item>
      <DropdownMenu.Item
        class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2"
        onclick={() => onSelect('exclude')}
      >
        <IconCheck class={cn('size-4', mode !== 'exclude' && 'text-transparent')} />
        is not
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/snippet}

{#snippet statusDot(status: TeamDisplayStatus)}
  {@const tone = statusTone(status)}
  <span
    class="size-1.5 shrink-0 rounded-full"
    class:bg-foreground-success={tone === 'success'}
    class:bg-foreground-yellow-l1={tone === 'warning'}
    class:bg-foreground-destructive={tone === 'danger'}
    class:bg-foreground-accent={tone === 'accent'}
  ></span>
{/snippet}

{#snippet statusText(status: TeamDisplayStatus)}
  {@const tone = statusTone(status)}
  <span
    class="inline-flex min-w-0 items-center gap-1.5 truncate whitespace-nowrap"
    class:text-foreground-success={tone === 'success'}
    class:text-foreground-yellow-l1={tone === 'warning'}
    class:text-foreground-destructive={tone === 'danger'}
    class:text-foreground-accent={tone === 'accent'}
  >
    {@render statusDot(status)}
    <span class="min-w-0 truncate">{teamStatusLabel(status)}</span>
  </span>
{/snippet}

{#snippet statusOption(status: TeamStatusFilter)}
  {@const selected = filters.status.selected.includes(status)}
  <DropdownMenu.CheckboxItem
    checked={selected}
    closeOnSelect={false}
    textValue={teamStatusLabel(status)}
    class="text-foreground-l2 hover:!bg-background-l5 hover:!text-foreground-l2 flex w-full min-w-0 cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none"
    onCheckedChange={checked => {
      if (checked !== selected) toggleStatus(status)
    }}
  >
    {@render statusDot(status)}
    <span class="min-w-0 truncate">{teamStatusLabel(status)}</span>
  </DropdownMenu.CheckboxItem>
{/snippet}

{#snippet divisionOption(division: DivisionFilterOption)}
  {@const selected = filters.division.selected.some(item => item.value === division.value)}
  <DropdownMenu.CheckboxItem
    checked={selected}
    closeOnSelect={false}
    textValue={division.label}
    class="text-foreground-l2 hover:!bg-background-l5 hover:!text-foreground-l2 flex w-full min-w-0 cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none"
    onCheckedChange={checked => {
      if (checked !== selected) toggleDivision(division)
    }}
  >
    <span class="min-w-0 truncate">{division.label}</span>
  </DropdownMenu.CheckboxItem>
{/snippet}

{#snippet statusFilterSelector()}
  <div class="p-1">
    {#each TEAM_STATUS_FILTERS as status}
      {@render statusOption(status)}
    {/each}
  </div>
{/snippet}

{#snippet divisionFilterSelector()}
  <div class="p-1">
    {#if divisionOptions.length === 0}
      <div class="text-foreground-l3 px-2 py-1.5 text-sm">No divisions found</div>
    {:else}
      {#each divisionOptions as division (division.value)}
        {@render divisionOption(division)}
      {/each}
    {/if}
  </div>
{/snippet}

{#snippet mobileCheckbox(checked: boolean)}
  <span
    class={cn(
      'border-foreground-l4/70 flex size-5 shrink-0 items-center justify-center rounded border-2',
      checked && 'bg-foreground-l1 text-background-l0 border-foreground-l1'
    )}
  >
    {#if checked}
      <IconCheck class="size-3.5" />
    {/if}
  </span>
{/snippet}

{#snippet mobileFilterModeControls(
  mode: FilterMode,
  count: number,
  onSelect: (mode: FilterMode) => void,
  onClear: () => void
)}
  <div class="flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2">
    <button
      type="button"
      class={cn(
        'text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l3 flex h-8 items-center rounded-md px-2 text-sm transition-colors',
        mode === 'include' && 'bg-background-l3 text-foreground-l1'
      )}
      onclick={() => onSelect('include')}
    >
      {filterOperatorLabel('include', count)}
    </button>
    <button
      type="button"
      class={cn(
        'text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l3 flex h-8 items-center rounded-md px-2 text-sm transition-colors',
        mode === 'exclude' && 'bg-background-l3 text-foreground-l1'
      )}
      onclick={() => onSelect('exclude')}
    >
      is not
    </button>
    {#if count > 0}
      <button
        type="button"
        class="text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l3 ml-auto flex h-8 items-center rounded-md px-2 text-sm transition-colors"
        onclick={onClear}
      >
        Clear
      </button>
    {/if}
  </div>
{/snippet}

{#snippet mobileStatusOption(status: TeamStatusFilter)}
  {@const selected = filters.status.selected.includes(status)}
  <button
    type="button"
    aria-pressed={selected}
    class="text-foreground-l2 hover:bg-background-l3 flex h-11 w-full items-center gap-3 rounded-md px-2 text-left transition-colors"
    onclick={() => toggleStatus(status)}
  >
    {@render mobileCheckbox(selected)}
    {@render statusDot(status)}
    <span class="min-w-0 flex-1 truncate">{teamStatusLabel(status)}</span>
  </button>
{/snippet}

{#snippet mobileDivisionOption(division: DivisionFilterOption)}
  {@const selected = filters.division.selected.some(item => item.value === division.value)}
  <button
    type="button"
    aria-pressed={selected}
    class="text-foreground-l2 hover:bg-background-l3 flex h-11 w-full items-center gap-3 rounded-md px-2 text-left transition-colors"
    onclick={() => toggleDivision(division)}
  >
    {@render mobileCheckbox(selected)}
    <span class="min-w-0 flex-1 truncate">{division.label}</span>
  </button>
{/snippet}

{#snippet mobileRootFilterRow(id: MobileTeamFilterId, label: string, summary: string)}
  <button
    type="button"
    class="text-foreground-l2 hover:bg-background-l3 flex h-11 w-full items-center gap-3 rounded-md px-2 text-left transition-colors"
    onclick={() => (mobileActiveFilterId = id)}
  >
    {#if id === 'status'}
      <IconShieldFilled class="text-foreground-l3 size-4 shrink-0" />
    {:else}
      <IconUsersGroup class="text-foreground-l3 size-4 shrink-0" />
    {/if}
    <span class="min-w-0 flex-1 truncate">{label}</span>
    {#if summary}
      <span class="text-foreground-l4 shrink-0 text-xs">{summary}</span>
    {/if}
    <IconChevronRight class="text-foreground-l4 size-4 shrink-0" />
  </button>
{/snippet}

{#snippet mobileFilterDrawerContent()}
  {#if mobileActiveFilterId === 'status'}
    {@render mobileFilterModeControls(
      filters.status.mode,
      filters.status.selected.length,
      mode => setFilterMode(filters.status, mode),
      () => clearFilter(filters.status)
    )}
    <ScrollArea class="min-h-0 flex-1" fadeSize={32} fadeColor="background-l1">
      <div class="flex flex-col gap-1 p-2">
        {#each TEAM_STATUS_FILTERS as status}
          {@render mobileStatusOption(status)}
        {/each}
      </div>
    </ScrollArea>
  {:else if mobileActiveFilterId === 'division'}
    {@render mobileFilterModeControls(
      filters.division.mode,
      filters.division.selected.length,
      mode => setFilterMode(filters.division, mode),
      () => clearFilter(filters.division)
    )}
    <ScrollArea class="min-h-0 flex-1" fadeSize={32} fadeColor="background-l1">
      {#if divisionOptions.length === 0}
        <div class="text-foreground-l3 px-4 py-8 text-center text-sm">No divisions found</div>
      {:else}
        <div class="flex flex-col gap-1 p-2">
          {#each divisionOptions as division (division.value)}
            {@render mobileDivisionOption(division)}
          {/each}
        </div>
      {/if}
    </ScrollArea>
  {:else}
    <ScrollArea class="min-h-0 flex-1" fadeSize={32} fadeColor="background-l1">
      <div class="flex flex-col gap-1 p-2">
        {@render mobileRootFilterRow('status', 'Status', statusFilterSummary())}
        {@render mobileRootFilterRow('division', 'Division', divisionFilterSummary())}
      </div>
    </ScrollArea>
  {/if}
{/snippet}

{#snippet mobileFilterDrawer()}
  <Drawer.Root bind:open={filterDrawerOpen}>
    <Drawer.Content class="h-[min(28rem,80dvh)] overflow-hidden">
      <Drawer.Header class="shrink-0 border-b-2 px-4 pt-4 pb-3">
        <div class="flex items-center gap-2">
          {#if mobileActiveFilterId}
            <button
              type="button"
              aria-label="Back to filters"
              class="text-foreground-l3 hover:bg-background-l3 hover:text-foreground-l1 flex size-8 shrink-0 items-center justify-center rounded-md transition-colors"
              onclick={() => (mobileActiveFilterId = null)}
            >
              <IconChevronRight class="size-4 rotate-180" />
            </button>
          {/if}
          <Drawer.Title class="min-w-0 flex-1 truncate text-base">
            {mobileDrawerTitle}
          </Drawer.Title>
          <button
            type="button"
            aria-label="Close filters"
            class="text-foreground-l3 hover:bg-background-l3 hover:text-foreground-l1 flex size-8 shrink-0 items-center justify-center rounded-md transition-colors"
            onclick={closeMobileFilterDrawer}
          >
            <IconX class="size-4" />
          </button>
        </div>
        <Drawer.Description class="sr-only">
          Choose team filters without opening nested menus.
        </Drawer.Description>
      </Drawer.Header>
      {@render mobileFilterDrawerContent()}
    </Drawer.Content>
  </Drawer.Root>
{/snippet}

{#snippet filterMenu()}
  {#if isMobileFilterMenu}
    <button
      type="button"
      aria-label="Add filter"
      class={cn(
        'bg-background-l4 text-foreground-l2 hover:bg-background-l5 hover:text-foreground-l1 flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors',
        hasFilters && 'text-foreground-accent'
      )}
      onclick={openMobileFilterDrawer}
    >
      <IconFilter class="size-4" />
    </button>
    {@render mobileFilterDrawer()}
  {:else}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="Add filter"
        class={cn(
          'bg-background-l4 text-foreground-l2 hover:bg-background-l5 hover:text-foreground-l1 flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors',
          hasFilters && 'text-foreground-accent'
        )}
      >
        <IconFilter class="size-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="start"
        class="bg-background-l4 border-foreground-l4/40 z-[100] w-56 overflow-hidden border-2 !p-1 shadow-xl"
      >
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger
            class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2 data-[state=open]:!bg-background-l5 data-[state=open]:!text-foreground-l2"
          >
            <IconShieldFilled class="size-4" />
            Status
          </DropdownMenu.SubTrigger>
          <DropdownMenu.SubContent
            align="start"
            alignOffset={-6}
            sideOffset={10}
            class="bg-background-l4 border-foreground-l4/40 z-[110] w-48 border-2 shadow-xl"
          >
            {@render statusFilterSelector()}
          </DropdownMenu.SubContent>
        </DropdownMenu.Sub>
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger
            class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2 data-[state=open]:!bg-background-l5 data-[state=open]:!text-foreground-l2"
          >
            <IconUsersGroup class="size-4" />
            Division
          </DropdownMenu.SubTrigger>
          <DropdownMenu.SubContent
            align="start"
            alignOffset={-6}
            sideOffset={10}
            class="bg-background-l4 border-foreground-l4/40 z-[110] w-56 border-2 shadow-xl"
          >
            {@render divisionFilterSelector()}
          </DropdownMenu.SubContent>
        </DropdownMenu.Sub>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  {/if}
{/snippet}

{#snippet searchInput()}
  <div
    class="bg-background-l2 text-foreground-l3 flex h-8 min-w-52 shrink-0 items-center gap-2 rounded-md border-2 px-2 md:w-72"
  >
    <IconSearch class="size-3.5 shrink-0" />
    <input
      type="text"
      value={filters.search}
      placeholder="Search teams or email..."
      oninput={event => updateSearch(event.currentTarget.value)}
      class="placeholder:text-foreground-l4 text-foreground-l1 min-w-0 flex-1 bg-transparent text-sm outline-none"
    />
  </div>
{/snippet}

{#snippet valueFilterCount(label: string, count: number)}
  <span class="text-foreground-l1 min-w-0 truncate">
    {count}
    {label}{count === 1 ? '' : 's'}
  </span>
{/snippet}

{#snippet statusChipValue()}
  {@const selected = filters.status.selected[0]}
  {#if filters.status.selected.length === 1 && selected}
    {@render statusDot(selected)}
    <span class="text-foreground-l1 min-w-0 truncate">{teamStatusLabel(selected)}</span>
  {:else}
    {@render valueFilterCount('status', filters.status.selected.length)}
  {/if}
{/snippet}

{#snippet divisionChipValue()}
  {@const selected = filters.division.selected[0]}
  {#if filters.division.selected.length === 1 && selected}
    <span class="text-foreground-l1 min-w-0 truncate">{selected.label}</span>
  {:else}
    {@render valueFilterCount('division', filters.division.selected.length)}
  {/if}
{/snippet}

{#snippet valueFilterChip(
  label: string,
  filter: MultiFilter<unknown>,
  selector: 'status' | 'division'
)}
  <span
    class="bg-background-l2 inline-flex h-8 shrink-0 items-center overflow-hidden rounded-md border-2 text-sm"
  >
    <span class="text-foreground-l3 flex h-full items-center gap-1 border-r-2 px-2">
      {#if selector === 'status'}
        <IconShieldFilled class="size-3.5" />
      {:else}
        <IconUsersGroup class="size-3.5" />
      {/if}
      {label}
    </span>
    {@render operatorDropdown(filter.mode, filter.selected.length, mode =>
      setFilterMode(filter, mode)
    )}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        class="hover:bg-background-l3 flex h-full min-w-0 items-center gap-1.5 px-2 transition-colors"
      >
        {#if selector === 'status'}
          {@render statusChipValue()}
        {:else}
          {@render divisionChipValue()}
        {/if}
        <IconChevronDown class="text-foreground-l4 size-3 shrink-0" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="start"
        class="bg-background-l4 border-foreground-l4/40 z-[120] w-56 border-2 shadow-xl"
      >
        {#if selector === 'status'}
          {@render statusFilterSelector()}
        {:else}
          {@render divisionFilterSelector()}
        {/if}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
    <button
      type="button"
      aria-label="Remove {label.toLowerCase()} filters"
      class="text-foreground-l3 hover:text-foreground-l1 flex h-full w-7 shrink-0 items-center justify-center border-l-2"
      onclick={() => {
        if (selector === 'status') clearFilter(filters.status)
        else clearFilter(filters.division)
      }}
    >
      <IconX class="size-3.5" />
    </button>
  </span>
{/snippet}

{#snippet filterChips()}
  <div
    class="hidden min-w-0 flex-1 flex-wrap items-center gap-1.5 overflow-visible whitespace-nowrap md:flex"
  >
    {#if filters.status.selected.length > 0}
      {@render valueFilterChip('Status', filters.status, 'status')}
    {/if}
    {#if filters.division.selected.length > 0}
      {@render valueFilterChip('Division', filters.division, 'division')}
    {/if}
  </div>
{/snippet}

{#snippet filterToolbar()}
  <div
    class="bg-background-l1 sticky left-0 z-20 flex min-w-0 items-center gap-3 overflow-visible border-b-2 px-3 py-2"
    style:width={pinnedToolbarWidth}
  >
    {@render filterMenu()}
    {@render searchInput()}
    {@render filterChips()}
    {#if hasFilters}
      <button
        type="button"
        class="text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l3 flex h-8 shrink-0 items-center gap-1 rounded-md px-2 text-sm transition-colors"
        onclick={clearFilters}
      >
        <IconX class="size-3.5" />
        Clear
      </button>
    {/if}
    {#if usersQuery.isFetching && !usersQuery.isFetchingNextPage}
      <Spinner class="text-foreground-l3 size-4 shrink-0" />
    {/if}
  </div>
{/snippet}

{#snippet tableHeader()}
  <div
    class="bg-background-l3 text-foreground-l3 relative z-10 grid grid-cols-[minmax(18rem,1.3fr)_9rem_11rem_minmax(16rem,1fr)_8rem_7rem_15rem_12rem] border-b-2 text-base"
  >
    <div class="font-normal">
      {@render sortHeader(AdminTeamSortBy.TEAM, 'Team')}
    </div>
    <div class="font-normal">
      {@render sortHeader(AdminTeamSortBy.STATUS, 'Status')}
    </div>
    <div class="font-normal">
      {@render sortHeader(AdminTeamSortBy.DIVISION, 'Division')}
    </div>
    <div class="font-normal">
      {@render sortHeader(AdminTeamSortBy.EMAIL, 'Email')}
    </div>
    <div class="font-normal">
      {@render sortHeader(AdminTeamSortBy.SCORE, 'Score')}
    </div>
    <div class="font-normal">
      {@render sortHeader(AdminTeamSortBy.SOLVES, 'Solves')}
    </div>
    <div class="font-normal">
      {@render sortHeader(AdminTeamSortBy.CREATED_AT, 'Registered')}
    </div>
    <div class="px-3 py-2 font-normal">Actions</div>
  </div>
{/snippet}

{#snippet teamCell(row: TeamRow)}
  {@const name = teamRowName(row)}
  <div
    class={cn(
      'flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap',
      row.kind === 'registered' && row.team.banned && 'opacity-70'
    )}
  >
    <Avatar.Root class="size-8 shrink-0 rounded-lg">
      {#if row.kind === 'registered' && row.team.avatarUrl}
        <Avatar.Image src={row.team.avatarUrl} alt={name} class="rounded-lg object-cover" />
      {/if}
      <Avatar.Fallback class="rounded-lg text-xs">{getInitials(name)}</Avatar.Fallback>
    </Avatar.Root>
    {#if row.kind === 'registered'}
      <a
        href="/profile/{row.team.id}"
        class="text-foreground-l1 min-w-0 truncate text-base leading-tight hover:underline"
      >
        {name}
      </a>
    {:else}
      <span class="text-foreground-l1 min-w-0 truncate text-base leading-tight">{name}</span>
    {/if}
  </div>
{/snippet}

{#snippet emailCell(row: TeamRow)}
  {@const email = teamRowEmail(row)}
  {#if email}
    <Tooltip.Root>
      <Tooltip.Trigger>
        <button
          type="button"
          class="text-foreground-l2 hover:text-foreground-l1 max-w-full truncate text-left hover:underline"
          onclick={() => copyEmail(email)}
        >
          {email}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content>Copy email</Tooltip.Content>
    </Tooltip.Root>
  {:else}
    <span class="text-foreground-l3 truncate">No email</span>
  {/if}
{/snippet}

{#snippet timeCell(row: TeamRow)}
  {@const timestamp = rowTime(row)}
  {@const ctfOffset = formatCtfOffset(timestamp)}
  <Tooltip.Root>
    <Tooltip.Trigger class="block max-w-full min-w-0 overflow-hidden">
      <div class="flex max-w-full min-w-0 items-baseline gap-2 overflow-hidden whitespace-nowrap">
        <span class="text-foreground-l1 shrink-0 tabular-nums">
          {row.kind === 'pending' ? 'Expires ' : ''}{formatLocalTime(timestamp)}
        </span>
        {#if ctfOffset}
          <span class="text-foreground-l3 min-w-0 truncate text-xs tabular-nums">
            {ctfOffset}
          </span>
        {/if}
      </div>
    </Tooltip.Trigger>
    <Tooltip.Content>
      {row.kind === 'registered' ? 'Registered' : 'Expires'} UTC {new Date(
        timestamp
      ).toISOString()}
    </Tooltip.Content>
  </Tooltip.Root>
{/snippet}

{#snippet registeredActions(team: AdminTeam)}
  {@const isAdmin = team.perms > 0}
  {@const isCopying = copyingTeamId === team.id}
  {@const isUpdating = updatingTeamId === team.id}
  {@const isDeleting = deletingTeamId === team.id}
  <div class="flex items-center gap-1">
    {#if hasWritePerms}
      {#if isAdmin}
        <Tooltip.Root>
          <Tooltip.Trigger>
            <div
              class="bg-background-accent text-foreground-accent flex size-8 items-center justify-center rounded-md"
            >
              <IconShieldFilled class="size-4" />
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>Admin account</Tooltip.Content>
        </Tooltip.Root>
      {:else}
        {#if hasTeamDetailsPerms}
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Button
                variant="secondary"
                size="icon"
                class="size-8"
                onclick={() => openManageTeam(team.id)}
                aria-label="Manage team"
              >
                <IconUserCog class="size-4" />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>Manage team</Tooltip.Content>
          </Tooltip.Root>
        {/if}
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button
              variant="secondary"
              size="icon"
              class="size-8"
              onclick={() => handleCopyToken(team)}
              disabled={isCopying}
              aria-label="Copy new token"
            >
              {#if isCopying}
                <Spinner class="size-4" />
              {:else}
                <IconCopy class="size-4" />
              {/if}
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>Copy new token</Tooltip.Content>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button
              variant={team.banned ? 'secondary' : 'destructive'}
              size="icon"
              class="size-8"
              onclick={() => handleBanAction(team)}
              disabled={isUpdating}
              aria-label={team.banned ? 'Unban team' : 'Ban team'}
            >
              {#if isUpdating}
                <Spinner class="size-4" />
              {:else}
                <IconMoodX class="size-4" />
              {/if}
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>{team.banned ? 'Unban team' : 'Ban team'}</Tooltip.Content>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button
              variant="destructive"
              size="icon"
              class="size-8"
              onclick={() => openDeleteDialog(team)}
              disabled={isDeleting}
              aria-label="Delete team"
            >
              {#if isDeleting}
                <Spinner class="size-4" />
              {:else}
                <IconTrashFilled class="size-4" />
              {/if}
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>Delete team</Tooltip.Content>
        </Tooltip.Root>
      {/if}
    {/if}
  </div>
{/snippet}

{#snippet pendingActions(verification: PendingVerification)}
  {@const isCompleting = completingVerificationId === verification.id}
  {@const isResending = resendingVerificationId === verification.id}
  <div class="flex items-center gap-1">
    {#if hasWritePerms}
      <Tooltip.Root>
        <Tooltip.Trigger>
          <Button
            variant="secondary"
            size="icon"
            class="size-8"
            onclick={() => handleResendVerification(verification)}
            disabled={isResending || isCompleting}
            aria-label="Resend verification"
          >
            {#if isResending}
              <Spinner class="size-4" />
            {:else}
              <IconSend class="size-4" />
            {/if}
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>Resend verification</Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <Button
            size="icon"
            class="size-8"
            onclick={() => handleCompleteVerification(verification)}
            disabled={isCompleting || isResending}
            aria-label="Verify team"
          >
            {#if isCompleting}
              <Spinner class="size-4" />
            {:else}
              <IconCheck class="size-4" />
            {/if}
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>Verify team</Tooltip.Content>
      </Tooltip.Root>
    {/if}
  </div>
{/snippet}

{#snippet rowActions(row: TeamRow)}
  {#if row.kind === 'registered'}
    {@render registeredActions(row.team)}
  {:else}
    {@render pendingActions(row.verification)}
  {/if}
{/snippet}

{#snippet teamRow(row: TeamRow, index: number)}
  {@const status = teamRowStatus(row)}
  <div
    class={cn(
      'grid h-full grid-cols-[minmax(18rem,1.3fr)_9rem_11rem_minmax(16rem,1fr)_8rem_7rem_15rem_12rem] overflow-hidden',
      index % 2 === 0 ? 'bg-background-l1' : 'bg-background-l2/70',
      'hover:bg-background-l3/80'
    )}
  >
    <div class="flex min-w-0 items-center px-3 py-2">
      {@render teamCell(row)}
    </div>
    <div class="flex min-w-0 items-center px-3 py-2">
      {@render statusText(status)}
    </div>
    <div class="text-foreground-l1 flex min-w-0 items-center truncate px-3 py-2">
      {clientConfig?.divisions[teamRowDivision(row)] ?? teamRowDivision(row)}
    </div>
    <div class="text-foreground-l2 flex min-w-0 items-center px-3 py-2">
      {@render emailCell(row)}
    </div>
    <div class="text-foreground-l1 flex items-center px-3 py-2 tabular-nums">
      {row.kind === 'registered' ? row.team.score.toLocaleString() : '-'}
    </div>
    <div class="text-foreground-l1 flex items-center px-3 py-2 tabular-nums">
      {row.kind === 'registered' ? row.team.solveCount.toLocaleString() : '-'}
    </div>
    <div class="text-foreground-l2 flex min-w-0 items-center px-3 py-2 tabular-nums">
      {@render timeCell(row)}
    </div>
    <div class="flex items-center px-3 py-2">
      {@render rowActions(row)}
    </div>
  </div>
{/snippet}

{#snippet teamsVirtualList()}
  <VirtualList
    virtualItems={scroll.virtualItems}
    totalSize={scroll.totalSize}
    items={tableRows}
    hasNextPage={shouldFetchRegisteredRows && usersQuery.hasNextPage}
    scrollMargin={listScrollMargin}
  >
    {#snippet children({ item, index })}
      {@render teamRow(item, index)}
    {/snippet}
  </VirtualList>
{/snippet}

{#snippet teamsTable()}
  <ScrollArea
    bind:viewportRef={scroll.state.viewportRef}
    class="bg-background-l1 h-full overflow-hidden rounded-lg border-2"
    orientation="both"
    type="always"
    fadeSize={48}
    fadeColor="background-l1"
    fadeOffsets={{ top: listScrollMargin }}
    scrollbarYClasses="z-40"
    scrollbarYStyles={`margin-top: ${listScrollMargin}px; height: calc(100% - ${listScrollMargin}px);`}
  >
    <div class="min-h-full w-full min-w-[94rem] text-sm">
      <div class="flex min-h-full flex-col">
        <div bind:this={tableHeaderRef} class="bg-background-l1 sticky top-0 z-50">
          {@render filterToolbar()}
          {@render tableHeader()}
        </div>
        {#if tableRows.length === 0}
          <EmptyState
            icon={IconUsersGroup}
            title={hasFilters ? 'No matching teams' : 'No teams'}
            subtitle={hasFilters
              ? 'Adjust or clear the filters to broaden the team list.'
              : 'Teams will appear here after registration.'}
            class="min-h-80 flex-1"
          />
        {:else}
          {@render teamsVirtualList()}
        {/if}
      </div>
    </div>
  </ScrollArea>
{/snippet}

<svelte:head>
  {#if clientConfig}
    <title>Teams | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

<svelte:window bind:innerWidth />

<div
  class="flex h-[calc(100dvh-72px)] w-full flex-col overflow-hidden px-4 pt-0 pb-4 md:px-9"
>
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
      {@render teamsTable()}
    {/if}
  </div>
</div>

<Dialog.Root open={selectedTeamId !== null} onOpenChange={open => !open && closeManageTeam()}>
  <Dialog.Content class="flex max-h-[min(720px,calc(100dvh-48px))] max-w-2xl flex-col">
    <Dialog.Header>
      <Dialog.Title>{selectedTeam?.name ?? 'Team'}</Dialog.Title>
      <Dialog.Description>
        {#if selectedTeam}
          {selectedTeam.email ?? 'No email'} - Registered {formatLocalTime(
            new Date(selectedTeam.createdAt).getTime()
          )}
        {:else}
          Loading team details
        {/if}
      </Dialog.Description>
    </Dialog.Header>

    {#if selectedTeamQuery.isPending}
      <div class="flex min-h-48 items-center justify-center">
        <Spinner class="size-6" />
      </div>
    {:else if selectedTeamQuery.error}
      <div class="text-foreground-l3 py-8 text-center">
        {selectedTeamQuery.error.message}
      </div>
    {:else if selectedTeam}
      <div class="grid gap-2 sm:grid-cols-3">
        <div class="bg-background-l2 rounded-lg p-3">
          <div class="text-foreground-l3 text-sm">Score</div>
          <div class="text-foreground-l1 text-xl tabular-nums">
            {selectedTeam.score.toLocaleString()}
          </div>
        </div>
        <div class="bg-background-l2 rounded-lg p-3">
          <div class="text-foreground-l3 text-sm">Solves</div>
          <div class="text-foreground-l1 text-xl tabular-nums">
            {selectedTeam.solveCount}
          </div>
        </div>
        <div class="bg-background-l2 rounded-lg p-3">
          <div class="text-foreground-l3 text-sm">Status</div>
          <div class="text-foreground-l1 text-xl">
            {teamStatusLabel(teamStatus(selectedTeam))}
          </div>
        </div>
      </div>

      <div class="mt-4 min-h-0 flex-1">
        <div class="text-foreground-l1 mb-2 flex items-center gap-2 text-sm font-medium">
          <IconTrophyFilled class="size-4" />
          Solves
        </div>

        {#if selectedTeam.solves.length === 0}
          <div class="bg-background-l2 text-foreground-l3 rounded-lg py-10 text-center">
            No solves yet
          </div>
        {:else}
          <ScrollArea class="max-h-80" fadeSize={48} fadeColor="background-l1">
            <div class="flex flex-col gap-2 pr-3">
              {#each selectedTeam.solves as solve (solve.challengeId)}
                {@const revokeKey = `${selectedTeam.id}:${solve.challengeId}`}
                <div class="bg-background-l2 flex items-center gap-3 rounded-lg p-3">
                  <div class="min-w-0 flex-1">
                    <div class="text-foreground-l1 truncate text-sm font-medium">
                      {solve.challengeName}
                    </div>
                    <div class="text-foreground-l3 truncate text-sm">
                      {solve.challengeCategory} - {formatLocalTime(
                        new Date(solve.createdAt).getTime()
                      )}
                    </div>
                  </div>
                  {#if hasSolveWritePerms}
                    <Button
                      variant="destructive"
                      size="sm"
                      onclick={() => handleRevokeSolve(solve)}
                      disabled={revokingSolveKey === revokeKey}
                    >
                      {#if revokingSolveKey === revokeKey}
                        <Spinner class="size-4" />
                      {:else}
                        <IconTrashFilled class="size-4" />
                      {/if}
                      Revoke
                    </Button>
                  {/if}
                </div>
              {/each}
            </div>
          </ScrollArea>
        {/if}
      </div>

      <Dialog.Footer>
        <Button variant="secondary" onclick={closeManageTeam}>Close</Button>
        {#if hasWritePerms && selectedTeam.perms === 0}
          <Button
            variant={selectedTeam.banned ? 'secondary' : 'destructive'}
            onclick={() => handleBanAction(selectedTeam)}
            disabled={updatingTeamId === selectedTeam.id}
          >
            {#if updatingTeamId === selectedTeam.id}
              <Spinner class="size-4" />
            {/if}
            {selectedTeam.banned ? 'Unban team' : 'Ban team'}
          </Button>
          <Button
            variant="destructive"
            onclick={() => openDeleteDialog(selectedTeam)}
            disabled={deletingTeamId === selectedTeam.id}
          >
            {#if deletingTeamId === selectedTeam.id}
              <Spinner class="size-4" />
            {/if}
            Delete team
          </Button>
        {/if}
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root open={banDialogTeam !== null} onOpenChange={open => !open && closeBanDialog()}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>Ban team</Dialog.Title>
      <Dialog.Description>
        Are you sure you want to ban <span class="text-foreground-l1 font-medium"
          >{banDialogTeam?.name}</span
        >? This removes the team from the leaderboard but keeps their account and solve history.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="secondary" onclick={closeBanDialog}>Cancel</Button>
      <Button
        variant="destructive"
        onclick={handleConfirmBan}
        disabled={banDialogTeam ? updatingTeamId === banDialogTeam.id : false}
      >
        {#if banDialogTeam && updatingTeamId === banDialogTeam.id}
          <Spinner class="size-4" />
        {/if}
        Ban team
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root open={deleteDialogTeam !== null} onOpenChange={open => !open && closeDeleteDialog()}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>Delete team</Dialog.Title>
      <Dialog.Description>
        Are you sure you want to delete <span class="text-foreground-l1 font-medium"
          >{deleteDialogTeam?.name}</span
        >? This removes the team and its solves from the database.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="secondary" onclick={closeDeleteDialog}>Cancel</Button>
      <Button
        variant="destructive"
        onclick={handleDeleteTeam}
        disabled={deleteDialogTeam ? deletingTeamId === deleteDialogTeam.id : false}
      >
        {#if deleteDialogTeam && deletingTeamId === deleteDialogTeam.id}
          <Spinner class="size-4" />
        {/if}
        Delete team
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

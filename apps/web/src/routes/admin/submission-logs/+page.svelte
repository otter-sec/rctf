<script lang="ts">
  import { SubmissionLogKind, SubmissionLogResult } from '@rctf/types'
  import {
    Avatar,
    Card,
    DropdownMenu,
    EmptyState,
    ScrollArea,
    Spinner,
    TeamDisplay,
    Tooltip,
  } from '$lib/components'
  import {
    IconCheck,
    IconChevronDown,
    IconChevronRight,
    IconChevronUp,
    IconFilter,
    IconFlag3Filled,
    IconPlus,
    IconPuzzleFilled,
    IconRobot,
    IconSearch,
    IconSelector,
    IconTableFilled,
    IconUsersGroup,
    IconX,
  } from '$lib/icons'
  import {
    useAdminChallenges,
    useClientConfig,
    useInfiniteAdminSubmissionLogs,
    useInfiniteAdminUsers,
  } from '$lib/query'
  import {
    cn,
    formatLocalTime,
    getCategoryConfig,
    getCategoryStyle,
    getInitials,
    useInfiniteVirtualScroll,
  } from '$lib/utils'

  const PAGE_SIZE = 100
  const ROW_HEIGHT = 48
  const TABLE_COLUMNS = 'grid-cols-[2.75rem_11rem_20rem_minmax(16rem,1fr)_11rem_9rem_10rem]'
  const ALL_FILTER = '__all__'
  const MENU_OPTION_CLASS =
    'text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2 data-[state=open]:!bg-background-l5 data-[state=open]:!text-foreground-l2'
  const SEARCH_OPTION_CLASS =
    'text-foreground-l2 hover:!bg-background-l5 hover:!text-foreground-l2 flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none'
  const FILTER_SCROLLBAR_CLASS = 'hidden'
  const KIND_FILTERS = [SubmissionLogKind.FLAG, SubmissionLogKind.ADMIN_BOT] as const
  const RESULT_FILTERS = [
    SubmissionLogResult.CORRECT,
    SubmissionLogResult.INCORRECT,
    SubmissionLogResult.RATE_LIMITED,
    SubmissionLogResult.ALREADY_SOLVED,
    SubmissionLogResult.QUEUED,
    SubmissionLogResult.ACTIVE_JOB,
    SubmissionLogResult.INVALID_INPUT,
    SubmissionLogResult.BAD_INSTANCER_STATE,
  ] as const

  type SortBy = 'createdAt' | 'challenge' | 'team' | 'ip' | 'kind' | 'result'
  type SortOrder = 'asc' | 'desc'
  type KindFilter = typeof ALL_FILTER | SubmissionLogKind
  type DetailEntry = { label: string; value: string }
  type ChallengeFilterOption = { id: string; name: string; category: string }
  type TeamFilterOption = { id: string; name: string; avatarUrl: string | null }
  type SubmissionLog = {
    id: string
    kind: string
    challengeId: string
    challengeName: string
    challengeCategory: string
    userId: string
    userName: string
    userDivision: string
    userAvatarUrl: string | null
    userCountryCode: string | null
    userStatusText: string | null
    userBanned: boolean
    ip: string
    result: string
    details: Record<string, unknown>
    relatedId: string | null
    createdAt: string
  }

  let sortBy = $state<SortBy>('createdAt')
  let sortOrder = $state<SortOrder>('desc')
  let challengeSearch = $state('')
  let teamSearch = $state('')
  let selectedChallenges = $state<ChallengeFilterOption[]>([])
  let selectedTeams = $state<TeamFilterOption[]>([])
  let kindFilter = $state<KindFilter>(ALL_FILTER)
  let selectedResults = $state<SubmissionLogResult[]>([])
  let expandedLogId = $state<string | null>(null)
  let tableHeaderRef = $state<HTMLElement | null>(null)
  let listScrollMargin = $state(0)

  const clientConfigQuery = useClientConfig()
  const challengesQuery = useAdminChallenges()
  const teamSuggestionsQuery = useInfiniteAdminUsers(
    () => 16,
    () => {
      const search = teamSearch.trim()
      return search.length >= 2 ? search : undefined
    },
    () => true
  )
  const clientConfig = $derived(clientConfigQuery.data)
  const trimmedChallengeSearch = $derived(challengeSearch.trim().toLowerCase())
  const trimmedTeamSearch = $derived(teamSearch.trim())
  const hasFilters = $derived(
    selectedChallenges.length > 0 ||
      selectedTeams.length > 0 ||
      kindFilter !== ALL_FILTER ||
      selectedResults.length > 0
  )
  const queryFingerprint = $derived(
    `${sortBy}:${sortOrder}:${selectedChallenges.map(c => c.id).join(',')}:${selectedTeams.map(t => t.id).join(',')}:${kindFilter}:${selectedResults.join(',')}`
  )
  const challengeOptions = $derived(
    (challengesQuery.data ?? [])
      .filter(challenge => !selectedChallenges.some(selected => selected.id === challenge.id))
      .filter(challenge => {
        if (!trimmedChallengeSearch) return true
        return (
          challenge.name.toLowerCase().includes(trimmedChallengeSearch) ||
          challenge.category.toLowerCase().includes(trimmedChallengeSearch)
        )
      })
      .map(challenge => ({
        id: challenge.id,
        name: challenge.name,
        category: challenge.category,
      }))
  )
  const teamOptions = $derived(
    (teamSuggestionsQuery.data?.pages.flatMap(page => page.users) ?? [])
      .filter(team => !selectedTeams.some(selected => selected.id === team.id))
      .map(team => ({
        id: team.id,
        name: team.name,
        avatarUrl: team.avatarUrl,
      }))
  )

  const logsQuery = useInfiniteAdminSubmissionLogs(
    () => {
      const params: {
        sortBy: SortBy
        sortOrder: SortOrder
        challengeIds?: string
        userIds?: string
        kind?: SubmissionLogKind
        results?: string
      } = {
        sortBy,
        sortOrder,
      }

      if (selectedChallenges.length > 0) {
        params.challengeIds = selectedChallenges.map(challenge => challenge.id).join(',')
      }
      if (selectedTeams.length > 0) {
        params.userIds = selectedTeams.map(team => team.id).join(',')
      }
      if (kindFilter !== ALL_FILTER) params.kind = kindFilter
      if (selectedResults.length > 0) params.results = selectedResults.join(',')

      return params
    },
    () => PAGE_SIZE
  )
  const allLogs = $derived(
    (logsQuery.data?.pages.flatMap(page => page.logs) ?? []) as SubmissionLog[]
  )
  const expandedLogIndex = $derived(
    expandedLogId ? allLogs.findIndex(log => log.id === expandedLogId) : -1
  )
  const visibleRowCount = $derived(allLogs.length + (expandedLogIndex === -1 ? 0 : 1))
  const scroll = useInfiniteVirtualScroll({
    rowHeight: ROW_HEIGHT,
    overscan: 12,
    onLoadMore: () => logsQuery.fetchNextPage(),
  })

  $effect(() => {
    scroll.state.count = visibleRowCount + (logsQuery.hasNextPage ? 1 : 0)
    scroll.state.hasNextPage = logsQuery.hasNextPage ?? false
    scroll.state.isFetching = logsQuery.isFetchingNextPage
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
    if (expandedLogId && expandedLogIndex === -1) {
      expandedLogId = null
    }
  })

  $effect(() => {
    queryFingerprint
    expandedLogId = null
    const viewport = scroll.state.viewportRef
    if (viewport) viewport.scrollTop = 0
  })

  function setSort(nextSortBy: SortBy) {
    if (sortBy === nextSortBy) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'
      return
    }

    sortBy = nextSortBy
    sortOrder = nextSortBy === 'createdAt' ? 'desc' : 'asc'
  }

  function resultLabel(result: string) {
    switch (result) {
      case 'correct':
        return 'Correct'
      case 'incorrect':
        return 'Incorrect'
      case 'rate_limited':
        return 'Rate limited'
      case 'already_solved':
        return 'Already solved'
      case 'queued':
        return 'Queued'
      case 'active_job':
        return 'Active job'
      case 'invalid_input':
        return 'Invalid input'
      case 'bad_instancer_state':
        return 'Bad instancer'
      default:
        return result
    }
  }

  function kindLabel(kind: string) {
    switch (kind) {
      case SubmissionLogKind.FLAG:
        return 'Flag'
      case SubmissionLogKind.ADMIN_BOT:
        return 'Admin bot'
      default:
        return kind
    }
  }

  function clearFilters() {
    challengeSearch = ''
    teamSearch = ''
    selectedChallenges = []
    selectedTeams = []
    kindFilter = ALL_FILTER
    selectedResults = []
  }

  function selectChallenge(challenge: ChallengeFilterOption) {
    if (!selectedChallenges.some(selected => selected.id === challenge.id)) {
      selectedChallenges = [...selectedChallenges, challenge]
    }
    challengeSearch = ''
  }

  function selectTeam(team: TeamFilterOption) {
    if (!selectedTeams.some(selected => selected.id === team.id)) {
      selectedTeams = [...selectedTeams, team]
    }
    teamSearch = ''
  }

  function removeChallenge(id: string) {
    selectedChallenges = selectedChallenges.filter(challenge => challenge.id !== id)
  }

  function removeTeam(id: string) {
    selectedTeams = selectedTeams.filter(team => team.id !== id)
  }

  function selectResult(result: SubmissionLogResult) {
    if (!selectedResults.includes(result)) {
      selectedResults = [...selectedResults, result]
    }
  }

  function toggleResult(result: SubmissionLogResult) {
    if (selectedResults.includes(result)) {
      removeResult(result)
      return
    }

    selectResult(result)
  }

  function removeResult(result: SubmissionLogResult) {
    selectedResults = selectedResults.filter(r => r !== result)
  }

  function resultClass(result: string) {
    switch (result) {
      case 'correct':
      case 'queued':
        return 'text-foreground-success'
      case 'rate_limited':
      case 'already_solved':
      case 'active_job':
        return 'text-foreground-yellow-l1'
      default:
        return 'text-foreground-destructive'
    }
  }

  function resultDotClass(result: string) {
    switch (result) {
      case 'correct':
      case 'queued':
        return 'bg-foreground-success'
      case 'rate_limited':
      case 'already_solved':
      case 'active_job':
        return 'bg-foreground-yellow-l1'
      default:
        return 'bg-foreground-destructive'
    }
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  function formatDetailValue(value: unknown): string {
    if (value === null || value === undefined) return 'none'
    if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  function detailEntries(log: SubmissionLog): DetailEntry[] {
    const details = isRecord(log.details) ? log.details : {}

    if (log.kind === SubmissionLogKind.FLAG) {
      return [
        {
          label: 'flag',
          value: formatDetailValue(details.submittedFlag),
        },
      ]
    }

    const entries: DetailEntry[] = []
    if (typeof details.configRevision === 'string') {
      entries.push({ label: 'revision', value: details.configRevision })
    }
    if (log.relatedId) {
      entries.push({ label: 'job', value: log.relatedId })
    }
    if (isRecord(details.inputs)) {
      for (const [key, value] of Object.entries(details.inputs)) {
        entries.push({ label: key, value: formatDetailValue(value) })
      }
    }
    if (typeof details.error === 'string') {
      entries.push({ label: 'error', value: details.error })
    }
    if (Array.isArray(details.instancerInstances)) {
      entries.push({
        label: 'instances',
        value: formatDetailValue(details.instancerInstances),
      })
    }

    return entries.length > 0 ? entries : [{ label: 'details', value: 'none' }]
  }

  function detailEntryClass(entry: DetailEntry) {
    return cn(
      'bg-background-l4 inline-flex min-w-0 shrink-0 items-center gap-1 rounded-md px-2 py-1 whitespace-nowrap',
      entry.label === 'error' && 'max-w-[36rem]',
      entry.label !== 'error' && 'max-w-[28rem]'
    )
  }

  function toggleLog(logId: string) {
    expandedLogId = expandedLogId === logId ? null : logId
  }

  function handleRowKeydown(event: KeyboardEvent, logId: string) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    toggleLog(logId)
  }

  function isDetailRowIndex(index: number) {
    return expandedLogIndex !== -1 && index === expandedLogIndex + 1
  }

  function logIndexForVirtualRow(index: number) {
    return expandedLogIndex !== -1 && index > expandedLogIndex ? index - 1 : index
  }

  function ipInfoUrl(ip: string) {
    return `https://check-host.net/ip-info?host=${encodeURIComponent(ip)}&lang=en`
  }

  function formatCompactDuration(ms: number): string {
    const totalMinutes = Math.max(0, Math.round(Math.abs(ms) / 60_000))
    const days = Math.floor(totalMinutes / 1440)
    const hours = Math.floor((totalMinutes % 1440) / 60)
    const minutes = totalMinutes % 60

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
    return `${minutes}m`
  }

  function formatCtfOffset(timestamp: number): string {
    const startTime = clientConfig?.startTime ?? 0
    if (!startTime) return ''

    const diff = timestamp - startTime
    return `T${diff < 0 ? '-' : '+'}${formatCompactDuration(diff)}`
  }
</script>

{#snippet sortIndicator(column: SortBy)}
  {#if sortBy === column}
    {#if sortOrder === 'asc'}
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

<svelte:head>
  {#if clientConfig}
    <title>Submission Logs | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

<div class="h-[calc(100dvh-72px)] w-full overflow-hidden px-4 pt-0 pb-4 md:px-9">
  {#if logsQuery.isPending}
    <div class="flex h-full items-center justify-center">
      <Spinner class="size-6" />
    </div>
  {:else if logsQuery.error}
    <div class="flex h-full items-center justify-center">
      <Card.Root class="max-w-md">
        <Card.Header>
          <Card.Title>Error</Card.Title>
        </Card.Header>
        <Card.Content>
          <p class="text-foreground-l3">{logsQuery.error.message}</p>
        </Card.Content>
      </Card.Root>
    </div>
  {:else}
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
      <div class="min-h-full w-full min-w-[86rem] text-sm">
        <div class="flex min-h-full flex-col">
          <div bind:this={tableHeaderRef} class="bg-background-l1 sticky top-0 z-50">
            <div
              class="relative z-20 flex min-w-0 items-center gap-1.5 overflow-visible border-b-2 px-3 py-2"
            >
              <DropdownMenu.Root>
                <DropdownMenu.Trigger
                  aria-label="Add filter"
                  class={cn(
                    'bg-background-l4 text-foreground-l2 hover:bg-background-l5 hover:text-foreground-l1 flex size-8 shrink-0 items-center justify-center rounded-md border ring-2 ring-transparent transition-colors',
                    hasFilters && 'text-foreground-accent ring-foreground-accent/50'
                  )}
                >
                  <IconFilter class="size-4" />
                </DropdownMenu.Trigger>
                <DropdownMenu.Content align="start" class="bg-background-l4 z-[100] w-56 shadow-xl">
                  <DropdownMenu.Label class="text-foreground-l3 flex items-center gap-2 text-sm">
                    <IconPlus class="size-4" />
                    Add filter
                  </DropdownMenu.Label>
                  <DropdownMenu.Separator />

                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger class={MENU_OPTION_CLASS}>
                      <IconPuzzleFilled class="size-4" />
                      Challenge
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent
                      class="bg-background-l4 z-[110] flex h-80 w-72 flex-col overflow-hidden !p-0 shadow-xl"
                    >
                      <div
                        class="text-foreground-l3 border-foreground-l4/40 flex h-11 shrink-0 items-center gap-2 border-b-2 px-3"
                        onclick={event => event.stopPropagation()}
                        onkeydown={event => event.stopPropagation()}
                        onpointerdown={event => event.stopPropagation()}
                      >
                        <IconSearch class="size-3.5 shrink-0" />
                        <input
                          type="text"
                          placeholder="Filter challenges..."
                          value={challengeSearch}
                          oninput={e => (challengeSearch = e.currentTarget.value)}
                          class="placeholder:text-foreground-l4 text-foreground-l1 min-w-0 flex-1 bg-transparent text-sm outline-none"
                        />
                      </div>
                      <ScrollArea
                        class="min-h-0 flex-1"
                        fadeSize={28}
                        fadeColor="background-l4"
                        scrollbarYClasses={FILTER_SCROLLBAR_CLASS}
                      >
                        <div class="p-1">
                          {#if challengesQuery.isPending}
                            <div
                              class="text-foreground-l3 flex items-center gap-2 px-2 py-1.5 text-sm"
                            >
                              <Spinner class="size-3.5" />
                              Loading challenges...
                            </div>
                          {:else if challengeOptions.length === 0}
                            <div class="text-foreground-l3 px-2 py-1.5 text-sm">
                              No challenges found
                            </div>
                          {:else}
                            {#each challengeOptions as challenge (challenge.id)}
                              {@const category = getCategoryConfig(challenge.category)}
                              <button
                                type="button"
                                tabindex="-1"
                                class={cn(SEARCH_OPTION_CLASS, 'min-w-0')}
                                style={getCategoryStyle(category.color)}
                                onmousedown={event => event.preventDefault()}
                                onclick={() => selectChallenge(challenge)}
                              >
                                <span class="min-w-0 truncate text-sm">
                                  <span class="text-category-foreground-l1">
                                    {challenge.category} /
                                  </span>
                                  <span class="text-category-foreground-l0">
                                    {challenge.name}
                                  </span>
                                </span>
                              </button>
                            {/each}
                          {/if}
                        </div>
                      </ScrollArea>
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Sub>

                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger class={MENU_OPTION_CLASS}>
                      <IconUsersGroup class="size-4" />
                      Team
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent
                      class="bg-background-l4 z-[110] flex h-80 w-72 flex-col overflow-hidden !p-0 shadow-xl"
                    >
                      <div
                        class="text-foreground-l3 border-foreground-l4/40 flex h-11 shrink-0 items-center gap-2 border-b-2 px-3"
                        onclick={event => event.stopPropagation()}
                        onkeydown={event => event.stopPropagation()}
                        onpointerdown={event => event.stopPropagation()}
                      >
                        <IconSearch class="size-3.5 shrink-0" />
                        <input
                          type="text"
                          placeholder="Filter teams..."
                          value={teamSearch}
                          oninput={e => (teamSearch = e.currentTarget.value)}
                          class="placeholder:text-foreground-l4 text-foreground-l1 min-w-0 flex-1 bg-transparent text-sm outline-none"
                        />
                      </div>
                      <ScrollArea
                        class="min-h-0 flex-1"
                        fadeSize={28}
                        fadeColor="background-l4"
                        scrollbarYClasses={FILTER_SCROLLBAR_CLASS}
                      >
                        <div class="p-1">
                          {#if teamSuggestionsQuery.isFetching && teamOptions.length === 0}
                            <div
                              class="text-foreground-l3 flex items-center gap-2 px-2 py-1.5 text-sm"
                            >
                              <Spinner class="size-3.5" />
                              Loading teams...
                            </div>
                          {:else if teamOptions.length === 0}
                            <div class="text-foreground-l3 px-2 py-1.5 text-sm">No teams found</div>
                          {:else}
                            {#each teamOptions as team (team.id)}
                              <button
                                type="button"
                                tabindex="-1"
                                class={cn(SEARCH_OPTION_CLASS, 'min-w-0')}
                                onmousedown={event => event.preventDefault()}
                                onclick={() => selectTeam(team)}
                              >
                                <Avatar.Root class="size-5 rounded-md">
                                  {#if team.avatarUrl}
                                    <Avatar.Image
                                      src={team.avatarUrl}
                                      alt={team.name}
                                      class="rounded-md object-cover"
                                    />
                                  {/if}
                                  <Avatar.Fallback class="rounded-md text-[9px]">
                                    {getInitials(team.name)}
                                  </Avatar.Fallback>
                                </Avatar.Root>
                                <span class="min-w-0 truncate text-sm">
                                  {team.name}
                                </span>
                              </button>
                            {/each}
                          {/if}
                        </div>
                      </ScrollArea>
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Sub>

                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger class={MENU_OPTION_CLASS}>
                      <IconFlag3Filled class="size-4" />
                      Kind
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent class="bg-background-l4 z-[110] w-48 shadow-xl">
                      <DropdownMenu.Item
                        class={MENU_OPTION_CLASS}
                        onclick={() => (kindFilter = ALL_FILTER)}
                      >
                        <IconCheck
                          class={cn('size-4', kindFilter !== ALL_FILTER && 'text-transparent')}
                        />
                        Any kind
                      </DropdownMenu.Item>
                      {#each KIND_FILTERS as kind}
                        <DropdownMenu.Item
                          class={MENU_OPTION_CLASS}
                          onclick={() => (kindFilter = kind)}
                        >
                          <IconCheck
                            class={cn('size-4', kindFilter !== kind && 'text-transparent')}
                          />
                          {#if kind === SubmissionLogKind.ADMIN_BOT}
                            <IconRobot class="size-4" />
                          {:else}
                            <IconFlag3Filled class="size-4" />
                          {/if}
                          {kindLabel(kind)}
                        </DropdownMenu.Item>
                      {/each}
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Sub>

                  <DropdownMenu.Sub>
                    <DropdownMenu.SubTrigger class={MENU_OPTION_CLASS}>
                      <IconTableFilled class="size-4" />
                      Result
                    </DropdownMenu.SubTrigger>
                    <DropdownMenu.SubContent class="bg-background-l4 z-[110] w-56 shadow-xl">
                      {#each RESULT_FILTERS as result}
                        {@const selected = selectedResults.includes(result)}
                        <DropdownMenu.Item
                          class={MENU_OPTION_CLASS}
                          onclick={() => toggleResult(result)}
                        >
                          <IconCheck class={cn('size-4', !selected && 'text-transparent')} />
                          <span class={cn('size-1.5 shrink-0 rounded-full', resultDotClass(result))}
                          ></span>
                          <span class={cn('truncate', resultClass(result))}>
                            {resultLabel(result)}
                          </span>
                        </DropdownMenu.Item>
                      {/each}
                    </DropdownMenu.SubContent>
                  </DropdownMenu.Sub>
                </DropdownMenu.Content>
              </DropdownMenu.Root>

              <div
                class="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 whitespace-nowrap"
              >
                {#each selectedChallenges as challenge (challenge.id)}
                  {@const category = getCategoryConfig(challenge.category)}
                  <span
                    class="bg-background-l2 inline-flex h-8 max-w-96 shrink-0 items-center overflow-hidden rounded-md border text-sm"
                  >
                    <span class="text-foreground-l3 flex h-full items-center gap-1 border-r px-2">
                      <IconPuzzleFilled class="size-3.5" />
                      Challenge
                    </span>
                    <span class="text-foreground-l4 flex h-full items-center border-r px-2">is</span
                    >
                    <span
                      class="flex min-w-0 items-center px-2"
                      style={getCategoryStyle(category.color)}
                    >
                      <span class="min-w-0 truncate">
                        <span class="text-category-foreground-l1">{challenge.category} /</span>
                        <span class="text-category-foreground-l0">{challenge.name}</span>
                      </span>
                    </span>
                    <button
                      type="button"
                      aria-label="Remove challenge filter"
                      class="text-foreground-l3 hover:text-foreground-l1 flex h-full w-7 shrink-0 items-center justify-center border-l"
                      onclick={() => removeChallenge(challenge.id)}
                    >
                      <IconX class="size-3.5" />
                    </button>
                  </span>
                {/each}

                {#each selectedTeams as team (team.id)}
                  <span
                    class="bg-background-l2 inline-flex h-8 max-w-80 shrink-0 items-center overflow-hidden rounded-md border text-sm"
                  >
                    <span class="text-foreground-l3 flex h-full items-center gap-1 border-r px-2">
                      <IconUsersGroup class="size-3.5" />
                      Team
                    </span>
                    <span class="text-foreground-l4 flex h-full items-center border-r px-2">is</span
                    >
                    <span class="text-foreground-l1 flex min-w-0 items-center gap-1.5 px-2">
                      <Avatar.Root class="size-4 rounded">
                        {#if team.avatarUrl}
                          <Avatar.Image
                            src={team.avatarUrl}
                            alt={team.name}
                            class="rounded object-cover"
                          />
                        {/if}
                        <Avatar.Fallback class="rounded text-[8px]">
                          {getInitials(team.name)}
                        </Avatar.Fallback>
                      </Avatar.Root>
                      <span class="min-w-0 truncate">{team.name}</span>
                    </span>
                    <button
                      type="button"
                      aria-label="Remove team filter"
                      class="text-foreground-l3 hover:text-foreground-l1 flex h-full w-7 shrink-0 items-center justify-center border-l"
                      onclick={() => removeTeam(team.id)}
                    >
                      <IconX class="size-3.5" />
                    </button>
                  </span>
                {/each}

                {#if kindFilter !== ALL_FILTER}
                  <span
                    class="bg-background-l2 inline-flex h-8 shrink-0 items-center overflow-hidden rounded-md border text-sm"
                  >
                    <span class="text-foreground-l3 flex h-full items-center gap-1 border-r px-2">
                      <IconFlag3Filled class="size-3.5" />
                      Kind
                    </span>
                    <span class="text-foreground-l4 flex h-full items-center border-r px-2">is</span
                    >
                    <span class="text-foreground-l1 flex h-full items-center gap-1 px-2">
                      {#if kindFilter === SubmissionLogKind.ADMIN_BOT}
                        <IconRobot class="size-3.5" />
                      {:else}
                        <IconFlag3Filled class="size-3.5" />
                      {/if}
                      {kindLabel(kindFilter)}
                    </span>
                    <button
                      type="button"
                      aria-label="Remove kind filter"
                      class="text-foreground-l3 hover:text-foreground-l1 flex h-full w-7 shrink-0 items-center justify-center border-l"
                      onclick={() => (kindFilter = ALL_FILTER)}
                    >
                      <IconX class="size-3.5" />
                    </button>
                  </span>
                {/if}

                {#each selectedResults as result (result)}
                  <span
                    class="bg-background-l2 inline-flex h-8 shrink-0 items-center overflow-hidden rounded-md border text-sm"
                  >
                    <span class="text-foreground-l3 flex h-full items-center gap-1 border-r px-2">
                      <IconTableFilled class="size-3.5" />
                      Result
                    </span>
                    <span class="text-foreground-l4 flex h-full items-center border-r px-2">is</span
                    >
                    <span class={cn('flex h-full items-center gap-1.5 px-2', resultClass(result))}>
                      <span class={cn('size-1.5 shrink-0 rounded-full', resultDotClass(result))}
                      ></span>
                      {resultLabel(result)}
                    </span>
                    <button
                      type="button"
                      aria-label="Remove result filter"
                      class="text-foreground-l3 hover:text-foreground-l1 flex h-full w-7 shrink-0 items-center justify-center border-l"
                      onclick={() => removeResult(result)}
                    >
                      <IconX class="size-3.5" />
                    </button>
                  </span>
                {/each}
              </div>

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
            </div>

            <div
              class={cn(
                'bg-background-l3 text-foreground-l3 relative z-10 grid border-b-2 text-base',
                TABLE_COLUMNS
              )}
            >
              <div></div>
              <div class="font-normal">{@render sortHeader('createdAt', 'Time')}</div>
              <div class="font-normal">{@render sortHeader('challenge', 'Challenge')}</div>
              <div class="font-normal">{@render sortHeader('team', 'Team')}</div>
              <div class="font-normal">{@render sortHeader('ip', 'IP')}</div>
              <div class="font-normal">{@render sortHeader('kind', 'Kind')}</div>
              <div class="font-normal">{@render sortHeader('result', 'Result')}</div>
            </div>
          </div>

          {#if allLogs.length === 0}
            <EmptyState
              icon={IconTableFilled}
              title={hasFilters ? 'No matching submissions' : 'No submission logs'}
              subtitle={hasFilters
                ? 'Adjust or clear the filters to broaden the audit trail.'
                : 'Submission IPs will appear here once teams submit flags or admin bot jobs'}
              class="min-h-80 flex-1"
            />
          {:else}
            <div
              class="relative contain-[layout_style] backface-hidden"
              style:height={`${scroll.totalSize}px`}
            >
              {#each scroll.virtualItems as row (row.index)}
                {#if row.index >= visibleRowCount}
                  <div
                    class="absolute top-0 left-0 flex w-full items-center justify-center"
                    style:height={`${row.size}px`}
                    style:transform={`translate3d(0, ${row.start - listScrollMargin}px, 0)`}
                  >
                    {#if logsQuery.hasNextPage}
                      <Spinner class="text-foreground-l3 size-5" />
                    {/if}
                  </div>
                {:else if isDetailRowIndex(row.index)}
                  {@const log = allLogs[expandedLogIndex]!}
                  {@const entries = detailEntries(log)}
                  <div
                    class="absolute top-0 left-0 w-full will-change-transform contain-[layout_style_paint]"
                    style:height={`${row.size}px`}
                    style:transform={`translate3d(0, ${row.start - listScrollMargin}px, 0)`}
                  >
                    <div
                      class="bg-background-l3 flex h-full min-w-0 items-center gap-2 overflow-hidden px-3 pl-12"
                    >
                      <span class="text-foreground-l3 shrink-0 text-sm whitespace-nowrap">
                        Submitted
                      </span>
                      <div
                        class="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 whitespace-nowrap"
                      >
                        {#each entries as entry (`${log.id}:${entry.label}:${entry.value}`)}
                          <Tooltip.Root>
                            <Tooltip.Trigger>
                              <span class={detailEntryClass(entry)}>
                                <span class="text-foreground-l3 shrink-0 text-xs">
                                  {entry.label}
                                </span>
                                <code class="text-foreground-l1 min-w-0 truncate text-xs">
                                  {entry.value}
                                </code>
                              </span>
                            </Tooltip.Trigger>
                            <Tooltip.Content class="max-w-md break-all">
                              {entry.label}: {entry.value}
                            </Tooltip.Content>
                          </Tooltip.Root>
                        {/each}
                      </div>
                      <button
                        type="button"
                        aria-label="Close submitted details"
                        class="text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l4 flex size-7 shrink-0 items-center justify-center rounded-md transition-colors"
                        onclick={() => (expandedLogId = null)}
                      >
                        <IconX class="size-4" />
                      </button>
                    </div>
                  </div>
                {:else}
                  {@const index = logIndexForVirtualRow(row.index)}
                  {@const log = allLogs[index]!}
                  {@const timestamp = new Date(log.createdAt).getTime()}
                  {@const ctfOffset = formatCtfOffset(timestamp)}
                  {@const category = getCategoryConfig(log.challengeCategory)}
                  {@const isExpanded = expandedLogId === log.id}
                  <div
                    class="absolute top-0 left-0 w-full will-change-transform contain-[layout_style_paint]"
                    style:height={`${row.size}px`}
                    style:transform={`translate3d(0, ${row.start - listScrollMargin}px, 0)`}
                  >
                    <div
                      class={cn(
                        'grid h-full cursor-pointer overflow-hidden',
                        TABLE_COLUMNS,
                        isExpanded
                          ? 'bg-background-l3'
                          : index % 2 === 0
                            ? 'bg-background-l1'
                            : 'bg-background-l2/70',
                        'hover:bg-background-l3/80'
                      )}
                      role="button"
                      tabindex="0"
                      aria-expanded={isExpanded}
                      onclick={() => toggleLog(log.id)}
                      onkeydown={event => handleRowKeydown(event, log.id)}
                    >
                      <div class="flex items-center justify-center">
                        <button
                          type="button"
                          aria-label="Show submitted details"
                          aria-expanded={isExpanded}
                          class="text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l4 flex size-7 items-center justify-center rounded-md transition-colors"
                          onclick={event => {
                            event.stopPropagation()
                            toggleLog(log.id)
                          }}
                        >
                          <IconChevronRight
                            class={cn('size-4 transition-transform', isExpanded && 'rotate-90')}
                          />
                        </button>
                      </div>
                      <div class="flex min-w-0 items-center px-3 py-2">
                        <Tooltip.Root>
                          <Tooltip.Trigger>
                            <div
                              class="flex max-w-full items-baseline gap-2 overflow-hidden whitespace-nowrap"
                            >
                              <span class="text-foreground-l1 shrink-0 tabular-nums">
                                {formatLocalTime(timestamp)}
                              </span>
                              {#if ctfOffset}
                                <span
                                  class="text-foreground-l3 min-w-0 truncate text-xs tabular-nums"
                                >
                                  {ctfOffset}
                                </span>
                              {/if}
                            </div>
                          </Tooltip.Trigger>
                          <Tooltip.Content>
                            UTC {new Date(log.createdAt).toISOString()}
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </div>
                      <div class="flex min-w-0 items-center px-3 py-2">
                        <a
                          href="/challenges?challenge={log.challengeId}"
                          class="group flex max-w-full min-w-0 items-center overflow-hidden whitespace-nowrap"
                          style={getCategoryStyle(category.color)}
                          onclick={event => event.stopPropagation()}
                        >
                          <span class="min-w-0 truncate text-base leading-tight">
                            <span class="text-category-foreground-l1">
                              {log.challengeCategory} /
                            </span>
                            <span class="text-category-foreground-l0 group-hover:underline">
                              {log.challengeName}
                            </span>
                          </span>
                        </a>
                      </div>
                      <div class="flex min-w-0 items-center px-3 py-2">
                        <TeamDisplay
                          id={log.userId}
                          name={log.userName}
                          avatarUrl={log.userAvatarUrl}
                          countryCode={log.userCountryCode}
                          statusText={log.userStatusText}
                          subtitle={log.userDivision}
                          banned={log.userBanned}
                          compact
                          showMeta={false}
                        />
                      </div>
                      <div class="flex min-w-0 items-center px-3 py-2">
                        <a
                          href={ipInfoUrl(log.ip)}
                          target="_blank"
                          rel="noreferrer"
                          class="bg-background-l4 text-foreground-l2 hover:text-foreground-l1 max-w-full truncate rounded-md px-2 py-1 text-xs whitespace-nowrap hover:underline"
                          onclick={event => event.stopPropagation()}
                        >
                          <code>{log.ip}</code>
                        </a>
                      </div>
                      <div class="flex min-w-0 items-center px-3 py-2">
                        <span
                          class="bg-background-l4 text-foreground-l2 inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs whitespace-nowrap"
                        >
                          {#if log.kind === SubmissionLogKind.ADMIN_BOT}
                            <IconRobot class="size-3.5 shrink-0" />
                            <span class="truncate">Admin bot</span>
                          {:else}
                            <IconFlag3Filled class="size-3.5 shrink-0" />
                            <span class="truncate">Flag</span>
                          {/if}
                        </span>
                      </div>
                      <div class="flex min-w-0 items-center px-3 py-2">
                        <span
                          class={cn(
                            'inline-flex min-w-0 items-center gap-1.5 truncate text-sm whitespace-nowrap',
                            resultClass(log.result)
                          )}
                        >
                          <span
                            class={cn('size-1.5 shrink-0 rounded-full', resultDotClass(log.result))}
                          ></span>
                          <span class="min-w-0 truncate">{resultLabel(log.result)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                {/if}
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </ScrollArea>
  {/if}
</div>

<script lang="ts">
  import {
    SubmissionLogKind,
    SubmissionLogResult,
    SubmissionLogSortBy,
    SubmissionLogSortOrder,
  } from '@rctf/types'
  import {
    Avatar,
    Card,
    DropdownMenu,
    EmptyState,
    ScrollArea,
    Spinner,
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
    formatCtfOffset,
    formatLocalTime,
    getCategoryConfig,
    getCategoryStyle,
    getInitials,
    useInfiniteVirtualScroll,
  } from '$lib/utils'
  import {
    canInspectIp,
    detailEntries,
    ipInfoUrl,
    KIND_FILTERS,
    kindLabel,
    RESULT_FILTERS,
    resultLabel,
    resultTone,
    type ChallengeFilterOption,
    type SortBy,
    type SubmissionLog,
    type TeamFilterOption,
  } from './submission-log-utils'

  const PAGE_SIZE = 100
  const ROW_HEIGHT = 48
  type VirtualRow = { index: number; size: number; start: number }

  let sortBy = $state<SortBy>(SubmissionLogSortBy.CREATED_AT)
  let sortOrder = $state<SubmissionLogSortOrder>(SubmissionLogSortOrder.DESC)
  let challengeSearch = $state('')
  let teamSearch = $state('')
  let selectedChallenges = $state<ChallengeFilterOption[]>([])
  let selectedTeams = $state<TeamFilterOption[]>([])
  let kindFilter = $state<SubmissionLogKind | null>(null)
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
  const hasFilters = $derived(
    selectedChallenges.length > 0 ||
      selectedTeams.length > 0 ||
      kindFilter !== null ||
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
        sortOrder: SubmissionLogSortOrder
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
      if (kindFilter) params.kind = kindFilter
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
      sortOrder =
        sortOrder === SubmissionLogSortOrder.ASC
          ? SubmissionLogSortOrder.DESC
          : SubmissionLogSortOrder.ASC
      return
    }

    sortBy = nextSortBy
    sortOrder =
      nextSortBy === SubmissionLogSortBy.CREATED_AT
        ? SubmissionLogSortOrder.DESC
        : SubmissionLogSortOrder.ASC
  }

  function clearFilters() {
    challengeSearch = ''
    teamSearch = ''
    selectedChallenges = []
    selectedTeams = []
    kindFilter = null
    selectedResults = []
  }

  function updateChallengeSearch(value: string) {
    challengeSearch = value
  }

  function updateTeamSearch(value: string) {
    teamSearch = value
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
</script>

{#snippet sortIndicator(column: SortBy)}
  {#if sortBy === column}
    {#if sortOrder === SubmissionLogSortOrder.ASC}
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

{#snippet resultDot(result: string)}
  {@const tone = resultTone(result)}
  <span
    class={cn(
      'size-1.5 shrink-0 rounded-full',
      tone === 'success'
        ? 'bg-foreground-success'
        : tone === 'warning'
          ? 'bg-foreground-yellow-l1'
          : 'bg-foreground-destructive'
    )}
  ></span>
{/snippet}

{#snippet resultText(result: string)}
  {@const tone = resultTone(result)}
  <span
    class={cn(
      'inline-flex min-w-0 items-center gap-1.5 truncate whitespace-nowrap',
      tone === 'success'
        ? 'text-foreground-success'
        : tone === 'warning'
          ? 'text-foreground-yellow-l1'
          : 'text-foreground-destructive'
    )}
  >
    {@render resultDot(result)}
    <span class="min-w-0 truncate">{resultLabel(result)}</span>
  </span>
{/snippet}

{#snippet filterSearchInput(
  value: string,
  placeholder: string,
  onInput: (value: string) => void
)}
  <div
    role="presentation"
    class="text-foreground-l3 border-foreground-l4/40 flex h-11 shrink-0 items-center gap-2 border-b-2 px-3"
    onclick={event => event.stopPropagation()}
    onkeydown={event => event.stopPropagation()}
    onpointerdown={event => event.stopPropagation()}
  >
    <IconSearch class="size-3.5 shrink-0" />
    <input
      type="text"
      {placeholder}
      {value}
      oninput={event => onInput(event.currentTarget.value)}
      class="placeholder:text-foreground-l4 text-foreground-l1 min-w-0 flex-1 bg-transparent text-sm outline-none"
    />
  </div>
{/snippet}

{#snippet challengeOption(challenge: ChallengeFilterOption)}
  {@const category = getCategoryConfig(challenge.category)}
  <button
    type="button"
    tabindex="-1"
    class="text-foreground-l2 hover:!bg-background-l5 hover:!text-foreground-l2 flex w-full min-w-0 cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none"
    style={getCategoryStyle(category.color)}
    onmousedown={event => event.preventDefault()}
    onclick={() => selectChallenge(challenge)}
  >
    <span class="min-w-0 truncate text-sm">
      <span class="text-category-foreground-l1">{challenge.category} /</span>
      <span class="text-category-foreground-l0">{challenge.name}</span>
    </span>
  </button>
{/snippet}

{#snippet teamOption(team: TeamFilterOption)}
  <button
    type="button"
    tabindex="-1"
    class="text-foreground-l2 hover:!bg-background-l5 hover:!text-foreground-l2 flex w-full min-w-0 cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none"
    onmousedown={event => event.preventDefault()}
    onclick={() => selectTeam(team)}
  >
    <Avatar.Root class="size-5 rounded-md">
      {#if team.avatarUrl}
        <Avatar.Image src={team.avatarUrl} alt={team.name} class="rounded-md object-cover" />
      {/if}
      <Avatar.Fallback class="rounded-md text-[9px]">
        {getInitials(team.name)}
      </Avatar.Fallback>
    </Avatar.Root>
    <span class="min-w-0 truncate text-sm">{team.name}</span>
  </button>
{/snippet}

{#snippet challengeFilterMenu()}
  <DropdownMenu.Sub>
    <DropdownMenu.SubTrigger
      class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2 data-[state=open]:!bg-background-l5 data-[state=open]:!text-foreground-l2"
    >
      <IconPuzzleFilled class="size-4" />
      Challenge
    </DropdownMenu.SubTrigger>
    <DropdownMenu.SubContent
      align="start"
      alignOffset={-6}
      sideOffset={10}
      class="bg-background-l4 border-foreground-l4/40 z-[110] flex h-80 w-72 flex-col overflow-hidden border-2 !p-0 shadow-xl"
    >
      {@render filterSearchInput(challengeSearch, 'Filter challenges...', updateChallengeSearch)}
      <ScrollArea
        class="min-h-0 flex-1"
        fadeSize={28}
        fadeColor="background-l4"
        scrollbarYClasses="hidden"
      >
        <div class="p-1">
          {#if challengesQuery.isPending}
            <div class="text-foreground-l3 flex items-center gap-2 px-2 py-1.5 text-sm">
              <Spinner class="size-3.5" />
              Loading challenges...
            </div>
          {:else if challengeOptions.length === 0}
            <div class="text-foreground-l3 px-2 py-1.5 text-sm">No challenges found</div>
          {:else}
            {#each challengeOptions as challenge (challenge.id)}
              {@render challengeOption(challenge)}
            {/each}
          {/if}
        </div>
      </ScrollArea>
    </DropdownMenu.SubContent>
  </DropdownMenu.Sub>
{/snippet}

{#snippet teamFilterMenu()}
  <DropdownMenu.Sub>
    <DropdownMenu.SubTrigger
      class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2 data-[state=open]:!bg-background-l5 data-[state=open]:!text-foreground-l2"
    >
      <IconUsersGroup class="size-4" />
      Team
    </DropdownMenu.SubTrigger>
    <DropdownMenu.SubContent
      align="start"
      alignOffset={-6}
      sideOffset={10}
      class="bg-background-l4 border-foreground-l4/40 z-[110] flex h-80 w-72 flex-col overflow-hidden border-2 !p-0 shadow-xl"
    >
      {@render filterSearchInput(teamSearch, 'Filter teams...', updateTeamSearch)}
      <ScrollArea
        class="min-h-0 flex-1"
        fadeSize={28}
        fadeColor="background-l4"
        scrollbarYClasses="hidden"
      >
        <div class="p-1">
          {#if teamSuggestionsQuery.isFetching && teamOptions.length === 0}
            <div class="text-foreground-l3 flex items-center gap-2 px-2 py-1.5 text-sm">
              <Spinner class="size-3.5" />
              Loading teams...
            </div>
          {:else if teamOptions.length === 0}
            <div class="text-foreground-l3 px-2 py-1.5 text-sm">No teams found</div>
          {:else}
            {#each teamOptions as team (team.id)}
              {@render teamOption(team)}
            {/each}
          {/if}
        </div>
      </ScrollArea>
    </DropdownMenu.SubContent>
  </DropdownMenu.Sub>
{/snippet}

{#snippet kindFilterMenu()}
  <DropdownMenu.Sub>
    <DropdownMenu.SubTrigger
      class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2 data-[state=open]:!bg-background-l5 data-[state=open]:!text-foreground-l2"
    >
      <IconFlag3Filled class="size-4" />
      Kind
    </DropdownMenu.SubTrigger>
    <DropdownMenu.SubContent
      align="start"
      alignOffset={-6}
      sideOffset={10}
      class="bg-background-l4 border-foreground-l4/40 z-[110] w-48 border-2 shadow-xl"
    >
      <DropdownMenu.Item
        class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2 data-[state=open]:!bg-background-l5 data-[state=open]:!text-foreground-l2"
        onclick={() => (kindFilter = null)}
      >
        <IconCheck class={cn('size-4', kindFilter !== null && 'text-transparent')} />
        Any kind
      </DropdownMenu.Item>
      {#each KIND_FILTERS as kind}
        <DropdownMenu.Item
          class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2 data-[state=open]:!bg-background-l5 data-[state=open]:!text-foreground-l2"
          onclick={() => (kindFilter = kind)}
        >
          <IconCheck class={cn('size-4', kindFilter !== kind && 'text-transparent')} />
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
{/snippet}

{#snippet resultFilterMenu()}
  <DropdownMenu.Sub>
    <DropdownMenu.SubTrigger
      class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2 data-[state=open]:!bg-background-l5 data-[state=open]:!text-foreground-l2"
    >
      <IconTableFilled class="size-4" />
      Result
    </DropdownMenu.SubTrigger>
    <DropdownMenu.SubContent
      align="start"
      alignOffset={-6}
      sideOffset={10}
      class="bg-background-l4 border-foreground-l4/40 z-[110] w-56 border-2 shadow-xl"
    >
      {#each RESULT_FILTERS as result}
        {@const selected = selectedResults.includes(result)}
        <DropdownMenu.Item
          class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2 data-[state=open]:!bg-background-l5 data-[state=open]:!text-foreground-l2"
          onclick={() => toggleResult(result)}
        >
          <IconCheck class={cn('size-4', !selected && 'text-transparent')} />
          {@render resultText(result)}
        </DropdownMenu.Item>
      {/each}
    </DropdownMenu.SubContent>
  </DropdownMenu.Sub>
{/snippet}

{#snippet filterMenu()}
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
    <DropdownMenu.Content
      align="start"
      class="bg-background-l4 border-foreground-l4/40 z-[100] w-56 border-2 shadow-xl"
    >
      <DropdownMenu.Label class="text-foreground-l3 flex items-center gap-2 text-sm">
        <IconPlus class="size-4" />
        Add filter
      </DropdownMenu.Label>
      <DropdownMenu.Separator />
      {@render challengeFilterMenu()}
      {@render teamFilterMenu()}
      {@render kindFilterMenu()}
      {@render resultFilterMenu()}
    </DropdownMenu.Content>
  </DropdownMenu.Root>
{/snippet}

{#snippet challengeChip(challenge: ChallengeFilterOption)}
  {@const category = getCategoryConfig(challenge.category)}
  <span
    class="bg-background-l2 inline-flex h-8 max-w-96 shrink-0 items-center overflow-hidden rounded-md border text-sm"
  >
    <span class="text-foreground-l3 flex h-full items-center gap-1 border-r px-2">
      <IconPuzzleFilled class="size-3.5" />
      Challenge
    </span>
    <span class="text-foreground-l4 flex h-full items-center border-r px-2">is</span>
    <span class="flex min-w-0 items-center px-2" style={getCategoryStyle(category.color)}>
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
{/snippet}

{#snippet teamChip(team: TeamFilterOption)}
  <span
    class="bg-background-l2 inline-flex h-8 max-w-80 shrink-0 items-center overflow-hidden rounded-md border text-sm"
  >
    <span class="text-foreground-l3 flex h-full items-center gap-1 border-r px-2">
      <IconUsersGroup class="size-3.5" />
      Team
    </span>
    <span class="text-foreground-l4 flex h-full items-center border-r px-2">is</span>
    <span class="text-foreground-l1 flex min-w-0 items-center gap-1.5 px-2">
      <Avatar.Root class="size-4 rounded">
        {#if team.avatarUrl}
          <Avatar.Image src={team.avatarUrl} alt={team.name} class="rounded object-cover" />
        {/if}
        <Avatar.Fallback class="rounded text-[8px]">{getInitials(team.name)}</Avatar.Fallback>
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
{/snippet}

{#snippet kindChip(kind: SubmissionLogKind)}
  <span
    class="bg-background-l2 inline-flex h-8 shrink-0 items-center overflow-hidden rounded-md border text-sm"
  >
    <span class="text-foreground-l3 flex h-full items-center gap-1 border-r px-2">
      <IconFlag3Filled class="size-3.5" />
      Kind
    </span>
    <span class="text-foreground-l4 flex h-full items-center border-r px-2">is</span>
    <span class="text-foreground-l1 flex h-full items-center gap-1 px-2">
      {#if kind === SubmissionLogKind.ADMIN_BOT}
        <IconRobot class="size-3.5" />
      {:else}
        <IconFlag3Filled class="size-3.5" />
      {/if}
      {kindLabel(kind)}
    </span>
    <button
      type="button"
      aria-label="Remove kind filter"
      class="text-foreground-l3 hover:text-foreground-l1 flex h-full w-7 shrink-0 items-center justify-center border-l"
      onclick={() => (kindFilter = null)}
    >
      <IconX class="size-3.5" />
    </button>
  </span>
{/snippet}

{#snippet resultChip(result: SubmissionLogResult)}
  <span
    class="bg-background-l2 inline-flex h-8 shrink-0 items-center overflow-hidden rounded-md border text-sm"
  >
    <span class="text-foreground-l3 flex h-full items-center gap-1 border-r px-2">
      <IconTableFilled class="size-3.5" />
      Result
    </span>
    <span class="text-foreground-l4 flex h-full items-center border-r px-2">is</span>
    <span class="flex h-full items-center gap-1.5 px-2">
      {@render resultText(result)}
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
{/snippet}

{#snippet filterChips()}
  <div class="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 whitespace-nowrap">
    {#each selectedChallenges as challenge (challenge.id)}
      {@render challengeChip(challenge)}
    {/each}
    {#each selectedTeams as team (team.id)}
      {@render teamChip(team)}
    {/each}
    {#if kindFilter}
      {@render kindChip(kindFilter)}
    {/if}
    {#each selectedResults as result (result)}
      {@render resultChip(result)}
    {/each}
  </div>
{/snippet}

{#snippet filterToolbar()}
  <div class="relative z-20 flex min-w-0 items-center gap-1.5 overflow-visible border-b-2 px-3 py-2">
    {@render filterMenu()}
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
  </div>
{/snippet}

{#snippet tableHeader()}
  <div
    class="bg-background-l3 text-foreground-l3 relative z-10 grid grid-cols-[2.75rem_11rem_20rem_minmax(16rem,1fr)_11rem_9rem_10rem] border-b-2 text-base"
  >
    <div></div>
    <div class="font-normal">
      {@render sortHeader(SubmissionLogSortBy.CREATED_AT, 'Time')}
    </div>
    <div class="font-normal">
      {@render sortHeader(SubmissionLogSortBy.CHALLENGE, 'Challenge')}
    </div>
    <div class="font-normal">
      {@render sortHeader(SubmissionLogSortBy.TEAM, 'Team')}
    </div>
    <div class="font-normal">
      {@render sortHeader(SubmissionLogSortBy.IP, 'IP')}
    </div>
    <div class="font-normal">
      {@render sortHeader(SubmissionLogSortBy.KIND, 'Kind')}
    </div>
    <div class="font-normal">
      {@render sortHeader(SubmissionLogSortBy.RESULT, 'Result')}
    </div>
  </div>
{/snippet}

{#snippet loadingRow(row: VirtualRow)}
  <div
    class="absolute top-0 left-0 flex w-full items-center justify-center"
    style:height={`${row.size}px`}
    style:transform={`translate3d(0, ${row.start - listScrollMargin}px, 0)`}
  >
    {#if logsQuery.hasNextPage}
      <Spinner class="text-foreground-l3 size-5" />
    {/if}
  </div>
{/snippet}

{#snippet detailPill(entry: { label: string; value: string })}
  <Tooltip.Root>
    <Tooltip.Trigger>
      <span
        class={cn(
          'bg-background-l4 inline-flex min-w-0 shrink-0 items-center gap-1 rounded-md px-2 py-1 whitespace-nowrap',
          entry.label === 'error' ? 'max-w-[36rem]' : 'max-w-[28rem]'
        )}
      >
        <span class="text-foreground-l3 shrink-0 text-xs">{entry.label}</span>
        <code class="text-foreground-l1 min-w-0 truncate text-xs">{entry.value}</code>
      </span>
    </Tooltip.Trigger>
    <Tooltip.Content class="max-w-md break-all">{entry.label}: {entry.value}</Tooltip.Content>
  </Tooltip.Root>
{/snippet}

{#snippet detailRow(row: VirtualRow, log: SubmissionLog)}
  {@const entries = detailEntries(log)}
  <div
    class="absolute top-0 left-0 w-full will-change-transform contain-[layout_style_paint]"
    style:height={`${row.size}px`}
    style:transform={`translate3d(0, ${row.start - listScrollMargin}px, 0)`}
  >
    <div class="bg-background-l3 flex h-full min-w-0 items-center gap-2 overflow-hidden px-3 pl-12">
      <span class="text-foreground-l3 shrink-0 text-sm whitespace-nowrap">Submitted</span>
      <div class="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-0.5 whitespace-nowrap">
        {#each entries as entry (`${log.id}:${entry.label}:${entry.value}`)}
          {@render detailPill(entry)}
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
{/snippet}

{#snippet timeCell(log: SubmissionLog)}
  {@const timestamp = new Date(log.createdAt).getTime()}
  {@const ctfOffset = formatCtfOffset(timestamp, clientConfig?.startTime)}
  <Tooltip.Root>
    <Tooltip.Trigger>
      <div class="flex max-w-full items-baseline gap-2 overflow-hidden whitespace-nowrap">
        <span class="text-foreground-l1 shrink-0 tabular-nums">
          {formatLocalTime(timestamp)}
        </span>
        {#if ctfOffset}
          <span class="text-foreground-l3 min-w-0 truncate text-xs tabular-nums">
            {ctfOffset}
          </span>
        {/if}
      </div>
    </Tooltip.Trigger>
    <Tooltip.Content>UTC {new Date(log.createdAt).toISOString()}</Tooltip.Content>
  </Tooltip.Root>
{/snippet}

{#snippet challengeCell(log: SubmissionLog)}
  {@const category = getCategoryConfig(log.challengeCategory)}
  <a
    href="/challenges?challenge={log.challengeId}"
    class="group flex max-w-full min-w-0 items-center overflow-hidden whitespace-nowrap"
    style={getCategoryStyle(category.color)}
    onclick={event => event.stopPropagation()}
  >
    <span class="min-w-0 truncate text-base leading-tight">
      <span class="text-category-foreground-l1">{log.challengeCategory} /</span>
      <span class="text-category-foreground-l0 group-hover:underline">{log.challengeName}</span>
    </span>
  </a>
{/snippet}

{#snippet teamCell(log: SubmissionLog)}
  <div
    class={cn(
      'flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap',
      log.userBanned && 'opacity-70'
    )}
  >
    <Avatar.Root class="size-8 shrink-0 rounded-lg">
      {#if log.userAvatarUrl}
        <Avatar.Image src={log.userAvatarUrl} alt={log.userName} class="rounded-lg object-cover" />
      {/if}
      <Avatar.Fallback class="rounded-lg text-xs">{getInitials(log.userName)}</Avatar.Fallback>
    </Avatar.Root>
    <a
      href="/profile/{log.userId}"
      class="text-foreground-l1 min-w-0 truncate text-base leading-tight hover:underline"
      onclick={event => event.stopPropagation()}
    >
      {log.userName}
    </a>
    {#if log.userBanned}
      <span class="text-foreground-destructive shrink-0 text-sm">banned</span>
    {/if}
  </div>
{/snippet}

{#snippet ipCell(log: SubmissionLog)}
  {#if canInspectIp(log.ip)}
    <a
      href={ipInfoUrl(log.ip)}
      target="_blank"
      rel="noreferrer"
      class="bg-background-l4 text-foreground-l2 hover:text-foreground-l1 max-w-full truncate rounded-md px-2 py-1 text-xs whitespace-nowrap hover:underline"
      onclick={event => event.stopPropagation()}
    >
      <code>{log.ip}</code>
    </a>
  {:else}
    <code
      class="bg-background-l4 text-foreground-l3 max-w-full truncate rounded-md px-2 py-1 text-xs whitespace-nowrap"
    >
      {log.ip}
    </code>
  {/if}
{/snippet}

{#snippet kindBadge(kind: SubmissionLogKind)}
  <span
    class="bg-background-l4 text-foreground-l2 inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs whitespace-nowrap"
  >
    {#if kind === SubmissionLogKind.ADMIN_BOT}
      <IconRobot class="size-3.5 shrink-0" />
      <span class="truncate">Admin bot</span>
    {:else}
      <IconFlag3Filled class="size-3.5 shrink-0" />
      <span class="truncate">Flag</span>
    {/if}
  </span>
{/snippet}

{#snippet logRow(row: VirtualRow, log: SubmissionLog, index: number)}
  {@const isExpanded = expandedLogId === log.id}
  <div
    class="absolute top-0 left-0 w-full will-change-transform contain-[layout_style_paint]"
    style:height={`${row.size}px`}
    style:transform={`translate3d(0, ${row.start - listScrollMargin}px, 0)`}
  >
    <div
      class={cn(
        'grid h-full cursor-pointer grid-cols-[2.75rem_11rem_20rem_minmax(16rem,1fr)_11rem_9rem_10rem] overflow-hidden',
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
          <IconChevronRight class={cn('size-4 transition-transform', isExpanded && 'rotate-90')} />
        </button>
      </div>
      <div class="flex min-w-0 items-center px-3 py-2">
        {@render timeCell(log)}
      </div>
      <div class="flex min-w-0 items-center px-3 py-2">
        {@render challengeCell(log)}
      </div>
      <div class="flex min-w-0 items-center px-3 py-2">
        {@render teamCell(log)}
      </div>
      <div class="flex min-w-0 items-center px-3 py-2">
        {@render ipCell(log)}
      </div>
      <div class="flex min-w-0 items-center px-3 py-2">
        {@render kindBadge(log.kind)}
      </div>
      <div class="flex min-w-0 items-center px-3 py-2">
        <span class="text-sm">
          {@render resultText(log.result)}
        </span>
      </div>
    </div>
  </div>
{/snippet}

{#snippet virtualRows()}
  <div
    class="relative contain-[layout_style] backface-hidden"
    style:height={`${scroll.totalSize}px`}
  >
    {#each scroll.virtualItems as row (row.index)}
      {#if row.index >= visibleRowCount}
        {@render loadingRow(row)}
      {:else if isDetailRowIndex(row.index)}
        {@render detailRow(row, allLogs[expandedLogIndex]!)}
      {:else}
        {@const index = logIndexForVirtualRow(row.index)}
        {@render logRow(row, allLogs[index]!, index)}
      {/if}
    {/each}
  </div>
{/snippet}

{#snippet logTable()}
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
          {@render filterToolbar()}
          {@render tableHeader()}
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
          {@render virtualRows()}
        {/if}
      </div>
    </div>
  </ScrollArea>
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
    {@render logTable()}
  {/if}
</div>

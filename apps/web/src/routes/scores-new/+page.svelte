<script lang="ts">
  import { goto } from '$app/navigation'
  import { page as pageState } from '$app/state'
  import { Avatar, ScrollArea, Tooltip } from '$lib/components'
  import {
    IconCircle,
    IconCircleCheckFilled,
    IconCircleDashed,
    IconCircleNumber1Filled,
    IconCircleNumber2Filled,
    IconCircleNumber3Filled,
  } from '$lib/icons'
  import {
    useCurrentUser,
    useLeaderboard,
    useLeaderboardChallenges,
    useLeaderboardGraph,
    useSelfUserGraph,
  } from '$lib/query'
  import { cn, getInitials } from '$lib/utils'
  import { getCategoryConfig, getCategoryOrder, getCategoryStyle } from '$lib/utils/categories'
  import { getRankStylesForPosition } from '$lib/utils/rank'
  import { formatLocalTime } from '$lib/utils/time'
  import { CUTOFF_TIME, PAGE_SIZE, SPARKLINE_WINDOW } from './constants'
  import Fades from './fades.svelte'
  import Graph from './graph.svelte'
  import Sparkline from './sparkline.svelte'

  interface TooltipData {
    teamId: string
    challengeName: string
    points: number
    solved: boolean
    bloodIndex: number
    solveTime?: number
  }

  type ViewMode = 'challenges' | 'categories' | 'minimal'
  type SortMode = 'categories' | 'solves'

  const page = $derived.by(() => {
    const n = parseInt(pageState.url.searchParams.get('page') ?? '1', 10)
    return isNaN(n) || n < 1 ? 1 : n
  })

  const viewMode = $derived.by(() => {
    const v = pageState.url.searchParams.get('view')
    if (v === 'categories' || v === 'minimal') return v as ViewMode
    return 'challenges' as ViewMode
  })

  const sortMode = $derived.by(() => {
    const s = pageState.url.searchParams.get('sort')
    return s === 'solves' ? 'solves' : ('categories' as SortMode)
  })

  function setParam(key: string, value: string | number, defaultValue: string | number) {
    const url = new URL(pageState.url)
    if (value === defaultValue) url.searchParams.delete(key)
    else url.searchParams.set(key, String(value))
    goto(url, { replaceState: true, keepFocus: true, noScroll: true })
  }

  const leaderboardQuery = $derived(
    useLeaderboard({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, division: 'open' })
  )
  const challengesQuery = $derived(useLeaderboardChallenges())
  const userQuery = useCurrentUser()

  const entries = $derived($leaderboardQuery.data?.leaderboard ?? [])
  const currentUser = $derived($userQuery.data)
  const challengesData = $derived($challengesQuery.data ?? {})

  const challengesByCategory = $derived(
    Object.entries(challengesData)
      .map(([id, info]) => ({
        id,
        ...info,
        order: getCategoryOrder(info.category),
        config: getCategoryConfig(info.category),
      }))
      .sort((a, b) => {
        if (a.order !== b.order) {
          if (a.order === -1 && b.order === -1) return a.category.localeCompare(b.category)
          if (a.order === -1) return 1
          if (b.order === -1) return -1
          return a.order - b.order
        }
        if (a.category !== b.category) return a.category.localeCompare(b.category)
        return b.points - a.points || a.name.localeCompare(b.name)
      })
  )

  const challengesBySolves = $derived(
    [...challengesByCategory].sort((a, b) => a.solves - b.solves || a.name.localeCompare(b.name))
  )

  const challenges = $derived(sortMode === 'solves' ? challengesBySolves : challengesByCategory)

  const categoryGroups = $derived(
    challengesByCategory.reduce<
      {
        category: string
        config: ReturnType<typeof getCategoryConfig>
        challenges: typeof challengesByCategory
      }[]
    >((groups, challenge) => {
      const last = groups.at(-1)
      if (last?.category === challenge.category) {
        last.challenges.push(challenge)
      } else {
        groups.push({
          category: challenge.category,
          config: challenge.config,
          challenges: [challenge],
        })
      }
      return groups
    }, [])
  )

  const solvesByTeam = $derived(new Map(entries.map(e => [e.id, new Set(e.solves.map(s => s.id))])))

  const solvesWithTimeByTeam = $derived(
    new Map(entries.map(e => [e.id, new Map(e.solves.map(s => [s.id, s.solveTime]))]))
  )

  const showSelfRow = $derived.by(() => {
    const rank = currentUser?.globalPlace
    if (!rank) return false
    return rank < (page - 1) * PAGE_SIZE + 1 || rank > page * PAGE_SIZE
  })

  const graphQuery = $derived(
    useLeaderboardGraph({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, division: 'open' })
  )
  const selfGraphQuery = $derived(
    useSelfUserGraph(showSelfRow && currentUser?.globalPlace ? currentUser.globalPlace : null)
  )

  const sparklineDataByTeam = $derived.by(() => {
    const graphData = $graphQuery.data ?? []
    const selfGraphData = $selfGraphQuery.data

    const allPoints: { time: number; score: number }[][] = []

    for (const team of graphData) {
      const filtered = team.points
        .filter(p => p.time <= CUTOFF_TIME)
        .map(p => ({ time: p.time, score: p.score }))
      allPoints.push(filtered)
    }

    if (selfGraphData) {
      const filtered = selfGraphData.points
        .filter(p => p.time <= CUTOFF_TIME)
        .map(p => ({ time: p.time, score: p.score }))
      allPoints.push(filtered)
    }

    const maxTime = Math.max(...allPoints.flatMap(pts => pts.map(p => p.time)), 0)
    const windowStart = maxTime - SPARKLINE_WINDOW

    const result = new Map<string, { time: number; score: number }[]>()

    for (const team of graphData) {
      const filtered = team.points
        .filter(p => p.time >= windowStart && p.time <= CUTOFF_TIME)
        .map(p => ({ time: p.time, score: p.score }))
      result.set(team.id, filtered)
    }

    if (selfGraphData && !result.has(selfGraphData.id)) {
      const filtered = selfGraphData.points
        .filter(p => p.time >= windowStart && p.time <= CUTOFF_TIME)
        .map(p => ({ time: p.time, score: p.score }))
      result.set(selfGraphData.id, filtered)
    }

    return result
  })

  let hoveredTeamId = $state<string | null>(null)
  let tooltipData = $state<TooltipData | null>(null)
  let tooltipX = $state(0)
  let tooltipY = $state(0)
  let hoverTimeout: ReturnType<typeof setTimeout> | null = null

  const solveHighlight = $derived(
    tooltipData?.solved && tooltipData.solveTime
      ? { teamId: tooltipData.teamId, time: tooltipData.solveTime }
      : null
  )

  function handleCellHover(data: TooltipData | null, x: number, y: number) {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
      hoverTimeout = null
    }

    if (data) {
      hoverTimeout = setTimeout(() => {
        hoveredTeamId = data.teamId
        tooltipData = data
        tooltipX = x
        tooltipY = y
      }, 300)
    } else {
      hoveredTeamId = null
      tooltipData = null
    }
  }

  function showCellTooltip(
    e: MouseEvent,
    teamId: string,
    challenge: (typeof challenges)[number],
    solved: boolean,
    bloodIndex: number,
    solveTime?: number
  ) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    handleCellHover(
      {
        teamId,
        challengeName: challenge.name,
        points: challenge.points,
        solved,
        bloodIndex,
        solveTime,
      },
      rect.left + rect.width / 2,
      rect.top
    )
  }

  function getCategoryStats(teamId: string, group: (typeof categoryGroups)[number]) {
    const solves = solvesByTeam.get(teamId)
    const solved = group.challenges.filter(c => solves?.has(c.id)).length
    return {
      solved,
      total: group.challenges.length,
      percent: (solved / group.challenges.length) * 100,
    }
  }

  function getSelfCategoryStats(group: (typeof categoryGroups)[number]) {
    if (!currentUser) return { solved: 0, total: group.challenges.length, percent: 0 }
    const solved = group.challenges.filter(c => currentUser.solves.some(s => s.id === c.id)).length
    return {
      solved,
      total: group.challenges.length,
      percent: (solved / group.challenges.length) * 100,
    }
  }

  function getBloodIndex(challengeId: string, teamId: string): number {
    const challenge = challengesData[challengeId]
    if (!challenge?.firstSolvers) return -1
    return challenge.firstSolvers.findIndex(s => s.id === teamId)
  }

  let viewportRef = $state<HTMLElement | null>(null)
  let showTopFade = $state(false)
  let showBottomFade = $state(true)
  let showLeftFade = $state(false)
  let showRightFade = $state(true)

  function updateFades() {
    const v = viewportRef
    if (!v) return

    const threshold = 10
    showTopFade = v.scrollTop > threshold
    showBottomFade = v.scrollTop + v.clientHeight < v.scrollHeight - threshold
    showLeftFade = v.scrollLeft > threshold
    showRightFade = v.scrollLeft + v.clientWidth < v.scrollWidth - threshold
  }

  $effect(() => {
    const v = viewportRef
    if (!v) return

    updateFades()
    v.addEventListener('scroll', updateFades, { passive: true })
    const observer = new ResizeObserver(updateFades)
    observer.observe(v)

    return () => {
      v.removeEventListener('scroll', updateFades)
      observer.disconnect()
    }
  })
</script>

{#snippet solveCell(solved: boolean, bloodIndex: number)}
  {#if bloodIndex === 0}
    <IconCircleNumber1Filled class="size-7 text-foreground-gold-l0" />
  {:else if bloodIndex === 1}
    <IconCircleNumber2Filled class="size-7 text-foreground-silver-l0" />
  {:else if bloodIndex === 2}
    <IconCircleNumber3Filled class="size-7 text-foreground-bronze-l0" />
  {:else if solved}
    <IconCircle class="size-7 text-foreground-success/75" />
  {:else}
    <IconCircleDashed class="size-7 text-foreground-l5/25" />
  {/if}
{/snippet}

{#snippet categoryCell(stats: { solved: number; total: number; percent: number })}
  {#if stats.solved === stats.total}
    <IconCircleCheckFilled class="size-7 text-category-foreground-l1" />
  {:else if stats.solved > 0}
    <svg class="size-7 -rotate-90" viewBox="0 0 24 24">
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        class="text-foreground-l5/20"
      />
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        stroke="currentColor"
        stroke-width="2.5"
        stroke-linecap="round"
        stroke-dasharray={2 * Math.PI * 10}
        stroke-dashoffset={2 * Math.PI * 10 * (1 - stats.percent / 100)}
        class="text-category-foreground-l1"
      />
    </svg>
  {:else}
    <IconCircleDashed class="size-7 text-foreground-l5/25" />
  {/if}
{/snippet}

{#snippet teamInfo(
  id: string,
  name: string,
  avatarUrl: string | null | undefined,
  division: string,
  divisionPlace: number | null,
  score: number,
  solveCount: number,
  rank: number,
  isCurrentUser: boolean,
  isFullWidth: boolean = false,
  sparklineData: { time: number; score: number }[] = [],
  onHover?: () => void,
  onUnhover?: () => void
)}
  {@const styles = getRankStylesForPosition(rank, isCurrentUser)}
  <div
    class={cn(
      'col-team sticky left-0 z-10 flex h-16 items-center justify-between px-4',
      'before:absolute before:inset-0 before:-z-10 before:bg-background-l2',
      isFullWidth ? 'rounded-lg before:rounded-lg' : 'rounded-l-lg before:rounded-l-lg',
      styles.bg,
      styles.gradient && [
        'after:absolute after:inset-y-0 after:left-0 after:-z-10 after:w-96 after:bg-linear-to-r after:to-transparent',
        isFullWidth ? 'after:rounded-lg' : 'after:rounded-l-lg',
        styles.gradient,
      ]
    )}
  >
    <div class="flex items-center gap-3">
      <div class="flex w-16 shrink-0 flex-col items-center">
        <span class={cn('text-xl tabular-nums', styles.fgL0)}>#{rank}</span>
        {#if divisionPlace}
          <span class={cn('text-base tabular-nums', styles.fgL1)}>#{divisionPlace}</span>
        {/if}
      </div>

      <Avatar.Root class="size-12 shrink-0 rounded-lg">
        {#if avatarUrl}
          <Avatar.Image src={avatarUrl} alt={name} class="rounded-lg" />
        {/if}
        <Avatar.Fallback class="rounded-lg text-sm">{getInitials(name)}</Avatar.Fallback>
      </Avatar.Root>

      <div class="flex h-full w-64 shrink-0 flex-col justify-center">
        <a href="/profile/{id}" class={cn('truncate text-xl hover:underline', styles.fgL0)}>
          {name}
        </a>
        <span class={cn('truncate text-base', styles.fgL1)}>{division}</span>
      </div>
    </div>

    <div class="flex items-center gap-4">
      <div class="flex w-28 shrink-0 flex-col items-end">
        <span class="text-xl tabular-nums text-foreground-l1">{score.toLocaleString()} pts</span>
        <span class="text-base text-foreground-l3"
          >{solveCount} solve{solveCount !== 1 ? 's' : ''}</span
        >
      </div>
      <div class="w-24 shrink-0">
        <Sparkline data={sparklineData} {rank} {isCurrentUser} {page} {onHover} {onUnhover} />
      </div>
    </div>
  </div>
{/snippet}

{#snippet cells(
  teamId: string,
  getSolves: (challengeId: string) => boolean,
  getSolveTime: (challengeId: string) => number | undefined,
  getCatStats: (group: (typeof categoryGroups)[number]) => { solved: number; total: number; percent: number }
)}
  <div class="col-cells flex gap-1 bg-background-l2 rounded-r-md pr-4">
    {#if viewMode === 'categories'}
      {#each categoryGroups as group}
        {@const stats = getCatStats(group)}
        <div
          class="flex h-16 w-12 items-center justify-center rounded-l-lg"
          style={getCategoryStyle(group.config.color)}
        >
          <Tooltip.Root>
            <Tooltip.Trigger class="flex items-center justify-center">
              {@render categoryCell(stats)}
            </Tooltip.Trigger>
            <Tooltip.Content side="top" sideOffset={4}>
              <p class="capitalize">{group.config.name}</p>
              <p class="text-foreground-l3">{stats.solved} / {stats.total} solved</p>
            </Tooltip.Content>
          </Tooltip.Root>
        </div>
      {/each}
    {:else if sortMode === 'categories'}
      {#each categoryGroups as group}
        <div class="flex gap-1">
          {#each group.challenges as challenge, ci}
            {@const solved = getSolves(challenge.id)}
            {@const bloodIndex = getBloodIndex(challenge.id, teamId)}
            {@const solveTime = getSolveTime(challenge.id)}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div
              class={cn('flex h-16 w-12 items-center justify-center', ci === 0 && 'rounded-l-lg')}
              style={getCategoryStyle(challenge.config.color)}
              onmouseenter={e =>
                showCellTooltip(e, teamId, challenge, solved, bloodIndex, solveTime)}
              onmouseleave={() => handleCellHover(null, 0, 0)}
            >
              {@render solveCell(solved, bloodIndex)}
            </div>
          {/each}
        </div>
      {/each}
    {:else}
      {#each challenges as challenge, i}
        {@const solved = getSolves(challenge.id)}
        {@const bloodIndex = getBloodIndex(challenge.id, teamId)}
        {@const solveTime = getSolveTime(challenge.id)}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class={cn('flex h-16 w-12 items-center justify-center', i === 0 && 'rounded-l-lg')}
          style={getCategoryStyle(challenge.config.color)}
          onmouseenter={e => showCellTooltip(e, teamId, challenge, solved, bloodIndex, solveTime)}
          onmouseleave={() => handleCellHover(null, 0, 0)}
        >
          {@render solveCell(solved, bloodIndex)}
        </div>
      {/each}
    {/if}
  </div>
{/snippet}

<div class="flex items-center justify-between px-9 py-2">
  <div class="flex items-center gap-4">
    <div class="flex items-center gap-2">
      <span class="text-sm text-foreground-l3">View</span>
      <div class="flex items-center gap-0.5">
        {#each ['challenges', 'categories', 'minimal'] as mode}
          <button
            class={cn(
              'rounded-lg px-3 py-1.5 text-sm',
              viewMode === mode
                ? 'bg-background-l3 text-foreground-l1'
                : 'text-foreground-l3 hover:bg-background-l2 hover:text-foreground-l2'
            )}
            onclick={() => setParam('view', mode, 'challenges')}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        {/each}
      </div>
    </div>

    {#if viewMode === 'challenges'}
      <div class="flex items-center gap-2">
        <span class="text-sm text-foreground-l3">Sort</span>
        <div class="flex items-center gap-0.5">
          <button
            class={cn(
              'rounded-lg px-3 py-1.5 text-sm',
              sortMode === 'categories'
                ? 'bg-background-l3 text-foreground-l1'
                : 'text-foreground-l3 hover:bg-background-l2 hover:text-foreground-l2'
            )}
            onclick={() => setParam('sort', 'categories', 'categories')}
          >
            Category
          </button>
          <button
            class={cn(
              'rounded-lg px-3 py-1.5 text-sm',
              sortMode === 'solves'
                ? 'bg-background-l3 text-foreground-l1'
                : 'text-foreground-l3 hover:bg-background-l2 hover:text-foreground-l2'
            )}
            onclick={() => setParam('sort', 'solves', 'categories')}
          >
            Difficulty
          </button>
        </div>
      </div>
    {/if}
  </div>

  <div class="flex items-center gap-2">
    <button
      class="rounded-lg bg-background-l2 px-3 py-1.5 text-sm text-foreground-l2 hover:bg-background-l3 disabled:opacity-50"
      onclick={() => setParam('page', page - 1, 1)}
      disabled={page === 1 || $leaderboardQuery.isFetching}
    >
      Prev
    </button>
    <span class={cn('text-sm text-foreground-l3', $leaderboardQuery.isFetching && 'opacity-50')}>
      Page {page}
    </span>
    <button
      class="rounded-lg bg-background-l2 px-3 py-1.5 text-sm text-foreground-l2 hover:bg-background-l3 disabled:opacity-50"
      onclick={() => setParam('page', page + 1, 1)}
      disabled={$leaderboardQuery.isFetching}
    >
      Next
    </button>
  </div>
</div>

<div class="flex justify-center px-9">
  <div
    class={cn('scoreboard relative', viewMode === 'minimal' ? 'w-full max-w-2xl' : 'max-w-full')}
    style:--self-row-offset={showSelfRow ? 'var(--self-row-height)' : '0px'}
  >
    <Fades
      showTop={showTopFade}
      showBottom={showBottomFade}
      showLeft={showLeftFade}
      showRight={showRightFade}
      {showSelfRow}
      isMinimal={viewMode === 'minimal'}
    />

    <ScrollArea
      class="h-[calc(100vh-140px)] rounded-lg"
      orientation="both"
      fadeSize={0}
      scrollbarXStyles={viewMode === 'minimal'
        ? ''
        : 'padding-left: var(--team-column-width); margin-right: -10px; z-index: 40;'}
      scrollbarYStyles="padding-top: var(--header-height); padding-bottom: calc(var(--self-row-offset) + 8px); z-index: 40;"
      bind:viewportRef
    >
      <div class="header-row sticky top-0 z-20 flex bg-background-l0">
        <div class="col-team sticky left-0 z-30 bg-background-l0">
          <div
            class={cn(
              'graph rounded-lg',
              viewMode !== 'minimal' && 'bg-background-l1 rounded-br-none mr-1'
            )}
          >
            <Graph
              class="h-full w-full"
              {hoveredTeamId}
              offset={(page - 1) * PAGE_SIZE}
              {solveHighlight}
            />
          </div>
        </div>

        {#if viewMode !== 'minimal' && !$challengesQuery.isLoading}
          <div class="col-headers flex flex-col">
            <div class="name-row flex items-end" class:gap-1={viewMode === 'challenges'}>
              {#if viewMode === 'categories'}
                <div class="flex gap-1 translate-x-1">
                  {#each categoryGroups as group}
                    <div class="relative w-12" style={getCategoryStyle(group.config.color)}>
                      <span
                        class="absolute bottom-0 left-1/2 max-w-[150px] origin-bottom-left -rotate-45 truncate text-lg capitalize text-category-foreground-l1"
                      >
                        {group.config.name}
                      </span>
                    </div>
                  {/each}
                </div>
              {:else if sortMode === 'categories'}
                {#each categoryGroups as group}
                  <div class="flex gap-1 translate-x-1">
                    {#each group.challenges as challenge}
                      <div class="relative w-12" style={getCategoryStyle(challenge.config.color)}>
                        <span
                          class="absolute bottom-0 left-1/2 max-w-[150px] origin-bottom-left -rotate-45 truncate text-lg text-category-foreground-l1"
                        >
                          {challenge.name}
                        </span>
                      </div>
                    {/each}
                  </div>
                {/each}
              {:else}
                {#each challenges as challenge}
                  <div
                    class="relative w-12 translate-x-1"
                    style={getCategoryStyle(challenge.config.color)}
                  >
                    <span
                      class="absolute bottom-0 left-1/2 max-w-[150px] origin-bottom-left -rotate-45 truncate text-lg text-category-foreground-l1"
                    >
                      {challenge.name}
                    </span>
                  </div>
                {/each}
              {/if}
            </div>

            <div class="flex items-stretch" class:gap-1={viewMode === 'challenges'}>
              {#if viewMode === 'categories'}
                <div class="flex gap-1">
                  {#each categoryGroups as group}
                    {@const Icon = group.config.icon}
                    {@const totalPoints = group.challenges.reduce((s, c) => s + c.points, 0)}
                    <div
                      class="relative flex flex-col rounded-t-lg bg-category-background-l0 before:absolute before:inset-0 before:-z-10 before:rounded-t-lg before:bg-background-l0"
                      style={getCategoryStyle(group.config.color)}
                    >
                      <Tooltip.Root>
                        <Tooltip.Trigger class="flex w-12 items-center justify-center py-1.5">
                          <span
                            class="flex size-5 items-center justify-center rounded bg-category-background-l1 text-sm leading-none text-category-foreground-l1 opacity-75"
                          >
                            {totalPoints}
                          </span>
                        </Tooltip.Trigger>
                        <Tooltip.Content side="bottom" sideOffset={4}>
                          <p class="capitalize">{group.config.name}</p>
                          <p class="text-foreground-l3">
                            {group.challenges.length} challenge{group.challenges.length !== 1
                              ? 's'
                              : ''} · {totalPoints} pts
                          </p>
                        </Tooltip.Content>
                      </Tooltip.Root>
                      <div class="flex items-center justify-center px-2 pb-2">
                        <Tooltip.Root>
                          <Tooltip.Trigger
                            class="flex items-center justify-center text-category-foreground-l1"
                          >
                            <Icon class="my-0.5 size-5" />
                          </Tooltip.Trigger>
                          <Tooltip.Content side="bottom" sideOffset={4}>
                            <span class="capitalize">{group.config.name}</span>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      </div>
                    </div>
                  {/each}
                </div>
              {:else if sortMode === 'categories'}
                {#each categoryGroups as group}
                  {@const Icon = group.config.icon}
                  <div
                    class="relative flex flex-col rounded-t-lg bg-category-background-l0 before:absolute before:inset-0 before:-z-10 before:rounded-t-lg before:bg-background-l0"
                    style={getCategoryStyle(group.config.color)}
                  >
                    <div class="flex gap-1 py-1.5">
                      {#each group.challenges as challenge}
                        <Tooltip.Root>
                          <Tooltip.Trigger class="flex w-12 items-center justify-center">
                            <span
                              class="flex size-5 items-center justify-center rounded bg-category-background-l1 text-sm leading-none text-category-foreground-l1 opacity-75"
                            >
                              {challenge.points}
                            </span>
                          </Tooltip.Trigger>
                          <Tooltip.Content side="bottom" sideOffset={4}>
                            <p>{challenge.name}</p>
                            <p class="text-foreground-l3">
                              {challenge.points} pts · {challenge.solves} solve{challenge.solves !==
                              1
                                ? 's'
                                : ''}
                            </p>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      {/each}
                    </div>
                    <div
                      class="flex items-center justify-center gap-1 overflow-hidden px-2 pb-2"
                      style:max-width="{group.challenges.length * 48}px"
                    >
                      {#if group.challenges.length > 1}
                        <Icon class="size-5 shrink-0 text-category-foreground-l1" />
                        <span class="truncate capitalize text-category-foreground-l1"
                          >{group.config.name}</span
                        >
                      {:else}
                        <Tooltip.Root>
                          <Tooltip.Trigger
                            class="flex items-center justify-center text-category-foreground-l1"
                          >
                            <Icon class="my-0.5 size-5" />
                          </Tooltip.Trigger>
                          <Tooltip.Content side="bottom" sideOffset={4}>
                            <span class="capitalize">{group.config.name}</span>
                          </Tooltip.Content>
                        </Tooltip.Root>
                      {/if}
                    </div>
                  </div>
                {/each}
              {:else}
                {#each challenges as challenge}
                  {@const Icon = challenge.config.icon}
                  <div
                    class="relative flex flex-col rounded-t-lg bg-category-background-l0 before:absolute before:inset-0 before:-z-10 before:rounded-t-lg before:bg-background-l0"
                    style={getCategoryStyle(challenge.config.color)}
                  >
                    <div class="flex py-1.5">
                      <Tooltip.Root>
                        <Tooltip.Trigger class="flex w-12 items-center justify-center">
                          <span
                            class="flex size-5 items-center justify-center rounded bg-category-background-l1 text-sm leading-none text-category-foreground-l1 opacity-75"
                          >
                            {challenge.points}
                          </span>
                        </Tooltip.Trigger>
                        <Tooltip.Content side="bottom" sideOffset={4}>
                          <p>{challenge.name}</p>
                          <p class="text-foreground-l3">
                            {challenge.points} pts · {challenge.solves} solve{challenge.solves !== 1
                              ? 's'
                              : ''}
                          </p>
                        </Tooltip.Content>
                      </Tooltip.Root>
                    </div>
                    <div class="flex items-center justify-center px-2 pb-2">
                      <Tooltip.Root>
                        <Tooltip.Trigger
                          class="flex items-center justify-center text-category-foreground-l1"
                        >
                          <Icon class="my-0.5 size-5" />
                        </Tooltip.Trigger>
                        <Tooltip.Content side="bottom" sideOffset={4}>
                          <span class="capitalize">{challenge.config.name}</span>
                        </Tooltip.Content>
                      </Tooltip.Root>
                    </div>
                  </div>
                {/each}
              {/if}
            </div>
          </div>
        {/if}
      </div>

      <div class={cn('flex flex-col gap-1', $leaderboardQuery.isFetching && 'opacity-50')}>
        {#if $leaderboardQuery.isLoading && $challengesQuery.isLoading}
          {#each Array(PAGE_SIZE) as _}
            <div class="bg-background-l2 data-row flex w-fit rounded-lg">
              <div class="col-team rounded-l-lg sticky left-0 z-10 flex h-16 items-center px-4">
                <div class="flex items-center gap-3">
                  <div class="flex w-16 flex-col items-center gap-1">
                    <div class="h-5 w-10 rounded bg-background-l3"></div>
                    <div class="h-4 w-8 rounded bg-background-l3"></div>
                  </div>
                  <div class="size-12 rounded-lg bg-background-l3"></div>
                  <div class="flex w-64 flex-col gap-1">
                    <div class="h-5 w-32 rounded bg-background-l3"></div>
                    <div class="h-4 w-20 rounded bg-background-l3"></div>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        {:else if $leaderboardQuery.isLoading}
          {@const colCount = viewMode === 'categories' ? categoryGroups.length : challenges.length}
          {#each Array(PAGE_SIZE) as _}
            <div class="bg-background-l2 data-row flex w-fit rounded-lg">
              <div class="col-team rounded-l-lg sticky left-0 z-10 flex h-16 items-center px-4">
                <div class="flex items-center gap-3">
                  <div class="flex w-16 flex-col items-center gap-1">
                    <div class="h-5 w-10 rounded bg-background-l3"></div>
                    <div class="h-4 w-8 rounded bg-background-l3"></div>
                  </div>
                  <div class="size-12 rounded-lg bg-background-l3"></div>
                  <div class="flex w-64 flex-col gap-1">
                    <div class="h-5 w-32 rounded bg-background-l3"></div>
                    <div class="h-4 w-20 rounded bg-background-l3"></div>
                  </div>
                </div>
              </div>
              {#if viewMode !== 'minimal'}
                <div class="col-cells flex gap-1 rounded-r-md bg-background-l2 pr-4">
                  {#each Array(colCount) as _}
                    <div class="h-16 w-12 bg-background-l2 flex items-center justify-center">
                      <IconCircleDashed class="size-7 text-foreground-l5/25" />
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        {:else}
          {#each entries as entry, i (entry.id)}
            {@const rank = (page - 1) * PAGE_SIZE + i + 1}
            {@const solves = solvesByTeam.get(entry.id)}
            {@const solveTimes = solvesWithTimeByTeam.get(entry.id)}
            {@const isYou = currentUser?.id === entry.id}

            <div class="bg-background-l1 data-row group flex w-fit rounded-lg">
              {@render teamInfo(
                entry.id,
                entry.name,
                entry.avatarUrl,
                entry.division,
                entry.divisionPlace,
                entry.score,
                entry.solves.length,
                rank,
                isYou,
                viewMode === 'minimal',
                sparklineDataByTeam.get(entry.id) ?? [],
                () => (hoveredTeamId = entry.id),
                () => (hoveredTeamId = null)
              )}

              {#if viewMode !== 'minimal'}
                {@render cells(
                  entry.id,
                  cid => solves?.has(cid) ?? false,
                  cid => solveTimes?.get(cid),
                  group => getCategoryStats(entry.id, group)
                )}
              {/if}
            </div>
          {/each}
        {/if}
      </div>

      {#if showSelfRow && currentUser}
        <div class="self-row sticky bottom-0 z-20 mt-2 bg-background-l0">
          <div class="bg-background-l1 data-row group flex w-fit rounded-lg">
            {@render teamInfo(
              currentUser.id,
              currentUser.name,
              currentUser.avatarUrl,
              currentUser.division,
              currentUser.divisionPlace,
              currentUser.score,
              currentUser.solves.length,
              currentUser.globalPlace ?? 0,
              true,
              viewMode === 'minimal',
              sparklineDataByTeam.get(currentUser.id) ?? [],
              () => (hoveredTeamId = currentUser.id),
              () => (hoveredTeamId = null)
            )}

            {#if viewMode !== 'minimal'}
              {@render cells(
                currentUser.id,
                cid => currentUser.solves.some(s => s.id === cid),
                cid => currentUser.solves.find(s => s.id === cid)?.createdAt,
                getSelfCategoryStats
              )}
            {/if}
          </div>
        </div>
      {/if}
    </ScrollArea>
  </div>
</div>

{#if tooltipData}
  {@const BLOOD_LABELS = ['First blood!', 'Second blood!', 'Third blood!']}
  {@const statusText =
    BLOOD_LABELS[tooltipData.bloodIndex] ?? (tooltipData.solved ? 'Solved!' : 'Unsolved')}
  <Tooltip.Provider>
    <Tooltip.Root open>
      <Tooltip.Trigger
        class="pointer-events-none fixed size-1"
        style="left:{tooltipX}px;top:{tooltipY}px;"
      />
      <Tooltip.Content side="top" sideOffset={4}>
        <p>{tooltipData.challengeName}</p>
        <p class="text-foreground-l3">{tooltipData.points} pts · {statusText}</p>
        {#if tooltipData.solveTime}
          <p class="text-foreground-l3">{formatLocalTime(tooltipData.solveTime)}</p>
        {/if}
      </Tooltip.Content>
    </Tooltip.Root>
  </Tooltip.Provider>
{/if}

<style>
  .scoreboard {
    --team-column-width: 42rem;
    --header-height: 12rem;
    --name-row-height: 8rem;
    --self-row-height: 5rem;
    --diagonal-overflow: 5rem;
  }

  .col-team {
    width: var(--team-column-width);
    flex-shrink: 0;
  }

  .col-headers,
  .col-cells {
    margin-right: var(--diagonal-overflow);
  }

  .graph {
    height: var(--header-height);
  }

  .name-row {
    height: var(--name-row-height);
  }

  .name-row > div {
    height: var(--name-row-height);
  }

  .self-row {
    height: var(--self-row-height);
  }
</style>

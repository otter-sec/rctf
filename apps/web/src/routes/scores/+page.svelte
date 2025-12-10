<script lang="ts">
  import { goto } from '$app/navigation'
  import { page as pageState } from '$app/state'
  import { Avatar, Checkbox, Label, ScrollArea, Tooltip } from '$lib/components'
  import {
    IconCircle,
    IconCircleCheckFilled,
    IconCircleDashed,
    IconCircleNumber1Filled,
    IconCircleNumber2Filled,
    IconCircleNumber3Filled,
    IconLayoutListFilled,
    IconListFilled,
    IconSortAscendingNumbers,
    IconSortDescendingShapesFilled,
    IconTableFilled,
    IconTriangleFilled,
    IconTriangleInvertedFilled,
  } from '$lib/icons'
  import {
    useCurrentUser,
    useLeaderboardChallenges,
    useLeaderboardWithGraph,
    useSelfUserGraph,
  } from '$lib/query'
  import { cn, getInitials } from '$lib/utils'
  import { getCategoryConfig, getCategoryOrder, getCategoryStyle } from '$lib/utils/categories'
  import { getRankStylesForPosition } from '$lib/utils/rank'
  import { formatLocalTime } from '$lib/utils/time'
  import { CUTOFF_TIME, DELTA_WINDOW, PAGE_SIZE, SPARKLINE_WINDOW } from './constants'
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
    useLeaderboardWithGraph({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE })
  )
  const challengesQuery = $derived(useLeaderboardChallenges())
  const userQuery = useCurrentUser()

  const entries = $derived($leaderboardQuery.data?.leaderboard ?? [])
  const graphData = $derived($leaderboardQuery.data?.graph ?? [])
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

  const selfGraphQuery = $derived(
    useSelfUserGraph(showSelfRow && currentUser?.globalPlace ? currentUser.globalPlace : null)
  )

  const sparklineDataByTeam = $derived.by(() => {
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

  const rankDeltaByTeam = $derived.by(() => {
    const selfGraphData = $selfGraphQuery.data
    const result = new Map<string, number>()

    const allPoints = graphData.flatMap(t => t.points.filter(p => p.time <= CUTOFF_TIME))
    if (allPoints.length === 0) return result

    const currentTime = Math.max(...allPoints.map(p => p.time))
    const pastTime = currentTime - DELTA_WINDOW

    function getScoreAtTime(points: { time: number; score: number }[], targetTime: number): number {
      const filtered = points.filter(p => p.time <= targetTime && p.time <= CUTOFF_TIME)
      if (filtered.length === 0) return 0
      const latest = filtered.reduce<{ time: number; score: number } | null>(
        (max, p) => (!max || p.time > max.time ? p : max),
        null
      )
      return latest?.score ?? 0
    }

    const teamsWithScores: { id: string; currentScore: number; pastScore: number }[] = []

    for (const team of graphData) {
      const currentScore = getScoreAtTime(team.points, currentTime)
      const pastScore = getScoreAtTime(team.points, pastTime)
      teamsWithScores.push({ id: team.id, currentScore, pastScore })
    }

    if (selfGraphData && !teamsWithScores.some(t => t.id === selfGraphData.id)) {
      const currentScore = getScoreAtTime(selfGraphData.points, currentTime)
      const pastScore = getScoreAtTime(selfGraphData.points, pastTime)
      teamsWithScores.push({ id: selfGraphData.id, currentScore, pastScore })
    }

    const currentRanks = [...teamsWithScores]
      .sort((a, b) => b.currentScore - a.currentScore)
      .map((t, i) => ({ id: t.id, rank: i + 1 }))
    const currentRankMap = new Map(currentRanks.map(t => [t.id, t.rank]))

    const pastRanks = [...teamsWithScores]
      .sort((a, b) => b.pastScore - a.pastScore)
      .map((t, i) => ({ id: t.id, rank: i + 1 }))
    const pastRankMap = new Map(pastRanks.map(t => [t.id, t.rank]))

    for (const team of teamsWithScores) {
      const currentRank = currentRankMap.get(team.id) ?? 0
      const pastRank = pastRankMap.get(team.id) ?? 0

      const delta = pastRank - currentRank
      if (delta !== 0) {
        result.set(team.id, delta)
      }
    }

    return result
  })

  let showTop3Context = $state(true)
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
    <IconCircleNumber1Filled class="text-foreground-gold-l0 size-7" />
  {:else if bloodIndex === 1}
    <IconCircleNumber2Filled class="text-foreground-silver-l0 size-7" />
  {:else if bloodIndex === 2}
    <IconCircleNumber3Filled class="text-foreground-bronze-l0 size-7" />
  {:else if solved}
    <IconCircle class="text-foreground-success/75 size-7" />
  {:else}
    <IconCircleDashed class="text-foreground-l5/25 size-7" />
  {/if}
{/snippet}

{#snippet categoryCell(stats: { solved: number; total: number; percent: number })}
  {#if stats.solved === stats.total}
    <IconCircleCheckFilled class="text-category-foreground-l1 size-7" />
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
    <IconCircleDashed class="text-foreground-l5/25 size-7" />
  {/if}
{/snippet}

{#snippet deltaIndicator(delta: number | undefined)}
  {#if delta && delta > 0}
    <div class="text-foreground-success flex items-center gap-0.5 text-sm tabular-nums">
      <IconTriangleFilled class="size-2.5" />
      <span>{delta}</span>
    </div>
  {:else if delta && delta < 0}
    <div class="text-foreground-destructive flex items-center gap-0.5 text-sm tabular-nums">
      <IconTriangleInvertedFilled class="size-2.5" />
      <span>{Math.abs(delta)}</span>
    </div>
  {/if}
{/snippet}

{#snippet mobileTeamRow(
  id: string,
  name: string,
  avatarUrl: string | null | undefined,
  division: string,
  divisionPlace: number | null,
  score: number,
  solveCount: number,
  rank: number,
  isCurrentUser: boolean,
  delta: number | undefined = undefined
)}
  {@const styles = getRankStylesForPosition(rank, isCurrentUser)}
  <div
    class={cn(
      'relative flex h-16 items-center gap-2 rounded-lg px-4',
      'before:bg-background-l2 before:absolute before:inset-0 before:-z-10 before:rounded-lg',
      styles.gradient && [
        'after:absolute after:inset-y-0 after:left-0 after:-z-10 after:w-96 after:max-w-full after:rounded-lg after:bg-linear-to-r after:to-transparent',
        styles.gradient,
      ]
    )}
  >
    <div class="flex shrink-0 items-center">
      <div class="w-6">
        {@render deltaIndicator(delta)}
      </div>
      <div class="flex w-12 flex-col items-center">
        <span class={cn('text-lg tabular-nums', styles.fgL0)}>#{rank}</span>
        {#if divisionPlace}
          <span class={cn('text-sm tabular-nums', styles.fgL1)}>#{divisionPlace}</span>
        {/if}
      </div>
    </div>

    <Avatar.Root class="size-10 shrink-0 rounded-lg">
      {#if avatarUrl}
        <Avatar.Image src={avatarUrl} alt={name} class="rounded-lg" />
      {/if}
      <Avatar.Fallback class="rounded-lg text-sm">{getInitials(name)}</Avatar.Fallback>
    </Avatar.Root>

    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <a href="/profile/{id}" class={cn('block truncate text-lg hover:underline', styles.fgL0)}
        >{name}</a
      >
      <span class={cn('truncate text-sm', styles.fgL1)}>{division}</span>
    </div>

    <div class="flex shrink-0 flex-col items-end">
      <span class="text-foreground-l1 text-lg tabular-nums"
        >{score.toLocaleString()} <span class="text-foreground-l3">pts</span></span
      >
      <span class="text-foreground-l3 text-sm">{solveCount} solve{solveCount !== 1 ? 's' : ''}</span
      >
    </div>
  </div>
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
  onUnhover?: () => void,
  delta: number | undefined = undefined
)}
  {@const styles = getRankStylesForPosition(rank, isCurrentUser)}
  <div
    class={cn(
      'col-team @container/team-info-desktop sticky left-0 z-10 flex h-16 items-center gap-2 px-4',
      'before:bg-background-l2 before:absolute before:inset-0 before:-z-10',
      isFullWidth ? 'rounded-lg before:rounded-lg' : 'rounded-l-lg before:rounded-l-lg',
      styles.bg,
      styles.gradient && [
        'after:absolute after:inset-y-0 after:left-0 after:-z-10 after:w-96 after:bg-linear-to-r after:to-transparent',
        isFullWidth ? 'after:rounded-lg' : 'after:rounded-l-lg',
        styles.gradient,
      ]
    )}
  >
    <div class="flex shrink-0 items-center">
      <div class="w-6">
        {@render deltaIndicator(delta)}
      </div>
      <div class="flex w-16 flex-col items-center">
        <span class={cn('text-xl tabular-nums', styles.fgL0)}>#{rank}</span>
        {#if divisionPlace}
          <span class={cn('text-base tabular-nums', styles.fgL1)}>#{divisionPlace}</span>
        {/if}
      </div>
    </div>

    <Avatar.Root class="size-12 shrink-0 rounded-lg">
      {#if avatarUrl}
        <Avatar.Image src={avatarUrl} alt={name} class="rounded-lg" />
      {/if}
      <Avatar.Fallback class="rounded-lg text-sm">{getInitials(name)}</Avatar.Fallback>
    </Avatar.Root>

    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <a href="/profile/{id}" class={cn('block truncate text-xl hover:underline', styles.fgL0)}
        >{name}</a
      >
      <span class={cn('truncate text-base', styles.fgL1)}>{division}</span>
    </div>

    <div class="flex shrink-0 items-center gap-4">
      <div class="flex w-28 flex-col items-end">
        <span class="text-foreground-l1 text-xl tabular-nums"
          >{score.toLocaleString()} <span class="text-foreground-l3">pts</span></span
        >
        <span class="text-foreground-l3 text-base"
          >{solveCount} solve{solveCount !== 1 ? 's' : ''}</span
        >
      </div>
      <div
        class="pointer-events-none absolute h-10 w-24 opacity-0 @lg/team-info-desktop:pointer-events-auto @lg/team-info-desktop:relative @lg/team-info-desktop:opacity-100"
      >
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
  <div class="bg-background-l2 mr-(--diagonal-overflow) flex gap-1 rounded-r-md pr-4 pl-1">
    {#if viewMode === 'categories'}
      {#each categoryGroups as group}
        {@const stats = getCatStats(group)}
        <div
          class="flex h-12 w-12 items-center justify-center rounded-l-lg md:h-16"
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

<div class="relative flex h-[calc(100vh-72px)] flex-col px-4 md:hidden">
  <div class="bg-background-l0 sticky top-0 z-30 pb-2">
    <div class="flex items-center justify-between py-2">
      <span class="text-foreground-l2 text-sm font-medium">Leaderboard</span>
      <div class="flex items-center gap-2">
        <button
          class="bg-background-l2 text-foreground-l2 hover:bg-background-l3 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
          onclick={() => setParam('page', page - 1, 1)}
          disabled={page === 1 || $leaderboardQuery.isFetching}
        >
          Prev
        </button>
        <span
          class={cn('text-foreground-l3 text-sm', $leaderboardQuery.isFetching && 'opacity-50')}
        >
          Page {page}
        </span>
        <button
          class="bg-background-l2 text-foreground-l2 hover:bg-background-l3 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
          onclick={() => setParam('page', page + 1, 1)}
          disabled={$leaderboardQuery.isFetching}
        >
          Next
        </button>
      </div>
    </div>

    <div class="bg-background-l1 h-48 w-full rounded-lg">
      <Graph
        class="h-full w-full"
        {hoveredTeamId}
        offset={(page - 1) * PAGE_SIZE}
        {solveHighlight}
        {graphData}
        {showTop3Context}
      />
    </div>
  </div>

  <ScrollArea class="min-h-0 flex-1">
    <div class={cn('flex flex-col gap-1', $leaderboardQuery.isFetching && 'opacity-50')}>
      {#if $leaderboardQuery.isLoading}
        {#each Array(PAGE_SIZE) as _}
          <div class="bg-background-l1 flex h-16 items-center gap-2 rounded-lg px-4">
            <div class="flex w-12 flex-col items-center gap-1">
              <div class="bg-background-l3 h-5 w-8 rounded"></div>
              <div class="bg-background-l3 h-4 w-6 rounded"></div>
            </div>
            <div class="bg-background-l3 size-10 rounded-lg"></div>
            <div class="flex flex-1 flex-col gap-1">
              <div class="bg-background-l3 h-5 w-28 rounded"></div>
              <div class="bg-background-l3 h-4 w-20 rounded"></div>
            </div>
            <div class="flex flex-col items-end gap-1">
              <div class="bg-background-l3 h-5 w-16 rounded"></div>
              <div class="bg-background-l3 h-4 w-12 rounded"></div>
            </div>
          </div>
        {/each}
      {:else}
        {#each entries as entry, i (entry.id)}
          {@const rank = (page - 1) * PAGE_SIZE + i + 1}
          {@const isYou = currentUser?.id === entry.id}
          {@render mobileTeamRow(
            entry.id,
            entry.name,
            entry.avatarUrl,
            entry.division,
            entry.divisionPlace,
            entry.score,
            entry.solves.length,
            rank,
            isYou,
            rankDeltaByTeam.get(entry.id)
          )}
        {/each}
      {/if}
    </div>
  </ScrollArea>

  {#if showSelfRow && currentUser}
    <div class="bg-background-l0 sticky bottom-0 z-30 py-4">
      {@render mobileTeamRow(
        currentUser.id,
        currentUser.name,
        currentUser.avatarUrl,
        currentUser.division,
        currentUser.divisionPlace,
        currentUser.score,
        currentUser.solves.length,
        currentUser.globalPlace ?? 0,
        true,
        rankDeltaByTeam.get(currentUser.id)
      )}
    </div>
  {/if}
</div>

<div class="hidden md:block">
  <div class="flex items-center justify-between px-9 py-2">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2">
        <span class="text-foreground-l3 text-sm">View</span>
        <div class="flex items-center gap-0.5">
          {#each [{ value: 'challenges', icon: IconTableFilled, label: 'Challenges' }, { value: 'categories', icon: IconLayoutListFilled, label: 'Categories' }, { value: 'minimal', icon: IconListFilled, label: 'Minimal' }] as option}
            <Tooltip.Root>
              <Tooltip.Trigger>
                <button
                  class={cn(
                    'text-foreground-l3 hover:text-foreground-l1 flex h-9 items-center justify-center rounded-lg px-3',
                    viewMode === option.value && 'bg-background-l3 text-foreground-l1'
                  )}
                  onclick={() => setParam('view', option.value, 'challenges')}
                >
                  <option.icon class="size-4" />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content side="bottom">{option.label}</Tooltip.Content>
            </Tooltip.Root>
          {/each}
        </div>
      </div>

      {#if viewMode === 'challenges'}
        <div class="flex items-center gap-2">
          <span class="text-foreground-l3 text-sm">Sort</span>
          <div class="flex items-center gap-0.5">
            {#each [{ value: 'categories', icon: IconSortDescendingShapesFilled, label: 'Category' }, { value: 'solves', icon: IconSortAscendingNumbers, label: 'Difficulty' }] as option}
              <Tooltip.Root>
                <Tooltip.Trigger>
                  <button
                    class={cn(
                      'text-foreground-l3 hover:text-foreground-l1 flex h-9 items-center justify-center rounded-lg px-3',
                      sortMode === option.value && 'bg-background-l3 text-foreground-l1'
                    )}
                    onclick={() => setParam('sort', option.value, 'categories')}
                  >
                    <option.icon class="size-4" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Content side="bottom">{option.label}</Tooltip.Content>
              </Tooltip.Root>
            {/each}
          </div>
        </div>
      {/if}
    </div>

    <div class="flex items-center gap-4">
      <div class="flex items-center gap-2">
        <Checkbox id="show-top3" bind:checked={showTop3Context} />
        <Label for="show-top3" class="text-foreground-l3 cursor-pointer text-sm">Show top 3</Label>
      </div>

      <div class="flex items-center gap-2">
        <button
          class="bg-background-l2 text-foreground-l2 hover:bg-background-l3 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
          onclick={() => setParam('page', page - 1, 1)}
          disabled={page === 1 || $leaderboardQuery.isFetching}
        >
          Prev
        </button>
        <span
          class={cn('text-foreground-l3 text-sm', $leaderboardQuery.isFetching && 'opacity-50')}
        >
          Page {page}
        </span>
        <button
          class="bg-background-l2 text-foreground-l2 hover:bg-background-l3 rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
          onclick={() => setParam('page', page + 1, 1)}
          disabled={$leaderboardQuery.isFetching}
        >
          Next
        </button>
      </div>
    </div>
  </div>

  <div class="flex justify-center px-9">
    <div
      class={cn(
        'scoreboard relative',
        viewMode === 'minimal' ? 'w-full max-w-2xl' : 'w-fit max-w-full'
      )}
      style:--self-row-offset={showSelfRow ? 'var(--self-row-height)' : '0px'}
      style:--team-column-width={viewMode === 'minimal' ? '100%' : undefined}
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
        <div class="header-row bg-background-l0 sticky top-0 z-20 flex">
          <div class="col-team bg-background-l0 sticky left-0 z-30">
            <div
              class={cn(
                'h-(--header-height) rounded-3xl rounded-bl-lg',
                viewMode !== 'minimal' && 'bg-background-l1 rounded-br-none'
              )}
            >
              <Graph
                class="h-full w-full"
                {hoveredTeamId}
                offset={(page - 1) * PAGE_SIZE}
                {solveHighlight}
                {graphData}
                {showTop3Context}
              />
            </div>
          </div>

          {#if viewMode !== 'minimal' && !$challengesQuery.isLoading}
            <div class="mr-(--diagonal-overflow) flex flex-col">
              <div
                class="flex h-(--name-row-height) items-end [&>div]:h-(--name-row-height)"
                class:gap-1={viewMode === 'challenges'}
              >
                {#if viewMode === 'categories'}
                  <div class="flex translate-x-1 gap-1">
                    {#each categoryGroups as group}
                      <div class="relative w-12" style={getCategoryStyle(group.config.color)}>
                        <span
                          class="text-category-foreground-l1 absolute bottom-0 left-1/2 max-w-[150px] origin-bottom-left -rotate-45 truncate text-lg capitalize"
                        >
                          {group.config.name}
                        </span>
                      </div>
                    {/each}
                  </div>
                {:else if sortMode === 'categories'}
                  {#each categoryGroups as group}
                    <div class="flex translate-x-1 gap-1">
                      {#each group.challenges as challenge}
                        <div class="relative w-12" style={getCategoryStyle(challenge.config.color)}>
                          <span
                            class="text-category-foreground-l1 absolute bottom-0 left-1/2 max-w-[150px] origin-bottom-left -rotate-45 truncate text-lg"
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
                        class="text-category-foreground-l1 absolute bottom-0 left-1/2 max-w-[150px] origin-bottom-left -rotate-45 truncate text-lg"
                      >
                        {challenge.name}
                      </span>
                    </div>
                  {/each}
                {/if}
              </div>

              <div class="ml-1 flex items-stretch" class:gap-1={viewMode === 'challenges'}>
                {#if viewMode === 'categories'}
                  <div class="flex gap-1">
                    {#each categoryGroups as group}
                      {@const Icon = group.config.icon}
                      {@const totalPoints = group.challenges.reduce((s, c) => s + c.points, 0)}
                      <div
                        class="bg-category-background-l0 before:bg-background-l0 relative flex flex-col rounded-t-lg before:absolute before:inset-0 before:-z-10 before:rounded-t-lg"
                        style={getCategoryStyle(group.config.color)}
                      >
                        <Tooltip.Root>
                          <Tooltip.Trigger class="flex w-12 items-center justify-center py-1.5">
                            <span
                              class="bg-category-background-l1 text-category-foreground-l1 flex size-5 items-center justify-center rounded text-sm leading-none opacity-75"
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
                              class="text-category-foreground-l1 flex items-center justify-center"
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
                      class="bg-category-background-l0 before:bg-background-l0 relative flex flex-col rounded-t-lg before:absolute before:inset-0 before:-z-10 before:rounded-t-lg"
                      style={getCategoryStyle(group.config.color)}
                    >
                      <div class="flex gap-1 py-1.5">
                        {#each group.challenges as challenge}
                          <Tooltip.Root>
                            <Tooltip.Trigger class="flex w-12 items-center justify-center">
                              <span
                                class="bg-category-background-l1 text-category-foreground-l1 flex size-5 items-center justify-center rounded text-sm leading-none opacity-75"
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
                          <Icon class="text-category-foreground-l1 size-5 shrink-0" />
                          <span class="text-category-foreground-l1 truncate capitalize"
                            >{group.config.name}</span
                          >
                        {:else}
                          <Tooltip.Root>
                            <Tooltip.Trigger
                              class="text-category-foreground-l1 flex items-center justify-center"
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
                      class="bg-category-background-l0 before:bg-background-l0 relative flex flex-col rounded-t-lg before:absolute before:inset-0 before:-z-10 before:rounded-t-lg"
                      style={getCategoryStyle(challenge.config.color)}
                    >
                      <div class="flex py-1.5">
                        <Tooltip.Root>
                          <Tooltip.Trigger class="flex w-12 items-center justify-center">
                            <span
                              class="bg-category-background-l1 text-category-foreground-l1 flex size-5 items-center justify-center rounded text-sm leading-none opacity-75"
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
                      </div>
                      <div class="flex items-center justify-center px-2 pb-2">
                        <Tooltip.Root>
                          <Tooltip.Trigger
                            class="text-category-foreground-l1 flex items-center justify-center"
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
              <div
                class={cn(
                  'bg-background-l2 data-row flex rounded-lg',
                  viewMode === 'minimal' ? 'w-full' : 'w-fit'
                )}
              >
                <div class="col-team sticky left-0 z-10 flex h-16 items-center rounded-lg px-4">
                  <div class="flex min-w-0 flex-1 items-center gap-3">
                    <div class="flex w-16 flex-col items-center gap-1">
                      <div class="bg-background-l3 h-5 w-10 rounded"></div>
                      <div class="bg-background-l3 h-4 w-8 rounded"></div>
                    </div>
                    <div class="bg-background-l3 size-12 rounded-lg"></div>
                    <div class="flex min-w-0 flex-1 flex-col gap-1">
                      <div class="bg-background-l3 h-5 w-32 max-w-full rounded"></div>
                      <div class="bg-background-l3 h-4 w-20 max-w-full rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          {:else if $leaderboardQuery.isLoading}
            {@const colCount =
              viewMode === 'categories' ? categoryGroups.length : challenges.length}
            {#each Array(PAGE_SIZE) as _}
              <div
                class={cn(
                  'bg-background-l2 data-row flex rounded-lg',
                  viewMode === 'minimal' ? 'w-full' : 'w-fit'
                )}
              >
                <div
                  class={cn(
                    'col-team sticky left-0 z-10 flex h-16 items-center px-4',
                    viewMode === 'minimal' ? 'rounded-lg' : 'rounded-l-lg'
                  )}
                >
                  <div class="flex min-w-0 flex-1 items-center gap-3">
                    <div class="flex w-16 flex-col items-center gap-1">
                      <div class="bg-background-l3 h-5 w-10 rounded"></div>
                      <div class="bg-background-l3 h-4 w-8 rounded"></div>
                    </div>
                    <div class="bg-background-l3 size-12 rounded-lg"></div>
                    <div class="flex min-w-0 flex-1 flex-col gap-1">
                      <div class="bg-background-l3 h-5 w-32 max-w-full rounded"></div>
                      <div class="bg-background-l3 h-4 w-20 max-w-full rounded"></div>
                    </div>
                  </div>
                </div>
                {#if viewMode !== 'minimal'}
                  <div
                    class="bg-background-l2 mr-(--diagonal-overflow) flex gap-1 rounded-r-md pr-4 pl-1"
                  >
                    {#each Array(colCount) as _}
                      <div class="bg-background-l2 flex h-16 w-12 items-center justify-center">
                        <IconCircleDashed class="text-foreground-l5/25 size-7" />
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

              <div
                class={cn(
                  'bg-background-l1 data-row group flex min-w-0 rounded-lg',
                  viewMode === 'minimal' ? 'w-full' : 'w-fit'
                )}
              >
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
                  () => (hoveredTeamId = null),
                  rankDeltaByTeam.get(entry.id)
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
          <div class="bg-background-l0 sticky bottom-0 z-20 mt-2 h-(--self-row-height)">
            <div
              class={cn(
                'bg-background-l1 data-row group flex min-w-0 rounded-lg',
                viewMode === 'minimal' ? 'w-full' : 'w-fit'
              )}
            >
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
                () => (hoveredTeamId = null),
                rankDeltaByTeam.get(currentUser.id)
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
    --team-column-width: 45vw;
    --header-height: 12rem;
    --name-row-height: 8rem;
    --self-row-height: 4rem;
    --diagonal-overflow: 5rem;
  }

  @media (max-width: 768px) {
    .scoreboard {
      --team-column-width: 100%;
    }
  }

  @media (min-width: 769px) and (max-width: 1280px) {
    .scoreboard {
      --team-column-width: 60vw;
    }
  }

  .col-team {
    width: var(--team-column-width);
    overflow: hidden;
  }
</style>

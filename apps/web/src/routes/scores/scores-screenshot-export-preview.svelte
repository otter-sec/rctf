<script lang="ts">
  import defaultWordmarkDark from '$lib/assets/wordmark-dark.svg'
  import { Avatar } from '$lib/components'
  import { useClientConfig } from '$lib/query'
  import { cn, countryCodeToFlagFilename, getInitials, getRankStylesForPosition } from '$lib/utils'
  import { getCategoryStyle } from '$lib/utils/categories'
  import { format, formatDuration, intervalToDuration } from 'date-fns'
  import ScoresGraph from './scores-leaderboard-graph.svelte'
  import ScoresSparkline from './scores-leaderboard-team-row-sparkline.svelte'
  import type { CategoryGroup } from './scores-shared-types'

  interface TeamEntry {
    id: string
    rank: number
    name: string
    avatarUrl: string | null
    countryCode: string | null
    statusText: string | null
    score: number
    solveCount: number
    isCurrentUser: boolean
    sparklineData?: { time: number; score: number }[]
    color?: string
  }

  interface GraphEntry {
    id: string
    name: string
    points: { time: number; score: number }[]
  }

  export interface ScreenshotOptions {
    teamCount: number
    graphTeamCount: number
    showSelf: boolean
    showGraph: boolean
    showAvatars: boolean
    showFlags: boolean
    showStatuses: boolean
    showSolveCount: boolean
    showSparklines: boolean
    showMatrix: boolean
    subtitle: string
    showHeader: boolean
    emphasizeListedTeams: boolean
    emphasizeSelfOnly: boolean
  }

  interface Props {
    teams: TeamEntry[]
    selfTeam: TeamEntry | null
    graphData: GraphEntry[]
    categoryGroups: CategoryGroup[]
    solvesByTeam: Map<string, Set<string>>
    options: ScreenshotOptions
    ctfName: string
    startTime: number | null
    endTime: number | null
    class?: string
  }

  let {
    teams,
    selfTeam,
    graphData,
    categoryGroups,
    solvesByTeam,
    options,
    ctfName,
    startTime,
    endTime,
    class: className = '',
  }: Props = $props()

  const clientConfigQuery = useClientConfig()
  const wordmarkDark = $derived(clientConfigQuery.data?.logoDarkUrl || defaultWordmarkDark)

  const ctfDateInfo = $derived.by(() => {
    if (!startTime || !endTime) return null
    const start = new Date(startTime)
    const end = new Date(endTime)
    const duration = intervalToDuration({ start, end })
    const durationStr = formatDuration(duration, { format: ['days', 'hours'] })
    const startStr = format(start, 'MMM d, yyyy')
    const endStr = format(end, 'MMM d, yyyy')
    return { startStr, endStr, durationStr }
  })

  const displayTeams = $derived.by(() => {
    const limited = teams.slice(0, options.teamCount)
    if (options.showSelf && selfTeam) {
      const selfInList = limited.some(t => t.id === selfTeam.id)
      if (!selfInList) {
        return [...limited, selfTeam]
      }
    }
    return limited
  })

  const teamRanks = $derived(new Map(teams.map((t, i) => [t.id, i + 1])))

  const visibleGraphData = $derived.by(() => {
    const graphTeamIds = new Set(teams.slice(0, options.graphTeamCount).map(t => t.id))
    return graphData.filter(g => graphTeamIds.has(g.id))
  })

  const listedTeamIds = $derived(new Set(displayTeams.map(t => t.id)))

  const contextTeamIds = $derived.by(() => {
    if (options.emphasizeSelfOnly && selfTeam) {
      return new Set(visibleGraphData.filter(g => g.id !== selfTeam.id).map(g => g.id))
    }
    if (!options.emphasizeListedTeams || options.graphTeamCount <= options.teamCount) {
      return undefined
    }
    return new Set(visibleGraphData.filter(g => !listedTeamIds.has(g.id)).map(g => g.id))
  })

  const shouldGreyOutContext = $derived(
    options.emphasizeSelfOnly ||
      (options.emphasizeListedTeams && options.graphTeamCount > options.teamCount)
  )

  function getCategoryStats(teamId: string, group: CategoryGroup) {
    const solves = solvesByTeam.get(teamId)
    if (!solves) return { solved: 0, total: group.challenges.length, percent: 0 }
    const solved = group.challenges.filter(c => solves.has(c.id)).length
    return {
      solved,
      total: group.challenges.length,
      percent: group.challenges.length > 0 ? (solved / group.challenges.length) * 100 : 0,
    }
  }

  const CELL_SIZE = 40
</script>

<div
  class={cn('bg-background-l0 flex w-fit flex-col gap-4 overflow-hidden p-6', className)}
  data-screenshot-container
>
  {#if options.showHeader}
    <div class="flex items-start justify-between">
      <img src={wordmarkDark} alt="Logo" class="h-10" />
      <div class="flex flex-col items-end gap-1.5">
        <span class="text-foreground-l0 text-2xl leading-none">{ctfName}</span>
        {#if options.subtitle}
          <span class="text-foreground-l2 text-base leading-none">{options.subtitle}</span>
        {/if}
        {#if ctfDateInfo}
          <span class="text-foreground-l3 text-base leading-none">
            {ctfDateInfo.startStr} → {ctfDateInfo.endStr}
            <span class="text-foreground-l4">({ctfDateInfo.durationStr})</span>
          </span>
        {/if}
      </div>
    </div>
  {/if}

  {#if options.showGraph}
    <div class="bg-background-l1 h-72 w-full overflow-hidden rounded-lg">
      <ScoresGraph
        class="h-full w-full p-4"
        graphData={visibleGraphData}
        {teamRanks}
        {contextTeamIds}
        showTop3Context={false}
        greyOutContext={shouldGreyOutContext}
      />
    </div>
  {/if}

  <div class="flex flex-col gap-1">
    {#if options.showMatrix && categoryGroups.length > 0}
      <div class="-mb-1 flex">
        <div class="w-150 shrink-0"></div>
        <div class="flex gap-1 pr-4">
          {#each categoryGroups as group}
            <div
              class="bg-category-background-l0 flex items-center justify-center rounded-t-lg"
              style="{getCategoryStyle(
                group.config.color
              )}; width: {CELL_SIZE}px; height: {CELL_SIZE}px;"
            >
              <group.config.icon class="text-category-foreground-l1 size-5" />
            </div>
          {/each}
        </div>
      </div>
    {/if}

    {#each displayTeams as team (team.id)}
      {@const styles = getRankStylesForPosition(team.rank, team.isCurrentUser)}
      {@const flagFilename = team.countryCode ? countryCodeToFlagFilename(team.countryCode) : null}
      {@const isSelfSeparator =
        options.showSelf &&
        selfTeam &&
        team.id === selfTeam.id &&
        !teams.slice(0, options.teamCount).some(t => t.id === selfTeam.id)}

      {#if isSelfSeparator}
        <div class="border-foreground-l5/30 my-2 flex items-center gap-3">
          <div class="flex-1 border-t"></div>
          <span class="text-foreground-l3 text-sm">My team</span>
          <div class="flex-1 border-t"></div>
        </div>
      {/if}

      <div class="flex">
        <div
          class={cn(
            'before:bg-background-l2 relative isolate flex h-16 w-150 shrink-0 items-center gap-4 rounded-lg px-4 before:absolute before:inset-0 before:-z-10 before:rounded-lg',
            styles.gradient && [
              'after:absolute after:inset-y-0 after:left-0 after:-z-10 after:w-64 after:max-w-full after:rounded-lg after:bg-linear-to-r after:to-transparent',
              styles.gradient,
              options.showMatrix && 'after:rounded-r-none',
            ],
            team.isCurrentUser && 'before:bg-background-self-l0',
            options.showMatrix && 'rounded-r-none before:rounded-r-none'
          )}
        >
          <div class="flex w-14 shrink-0 justify-center">
            <span class={cn('text-xl tabular-nums', styles.fgL0)}>#{team.rank}</span>
          </div>

          {#if options.showAvatars}
            <Avatar.Root class="size-12 shrink-0 rounded-lg">
              {#if team.avatarUrl}
                <Avatar.Image src={team.avatarUrl} alt={team.name} class="rounded-lg" />
              {/if}
              <Avatar.Fallback class="rounded-lg text-sm">{getInitials(team.name)}</Avatar.Fallback>
            </Avatar.Root>
          {/if}

          <div class="flex min-w-0 flex-1 flex-col">
            <div class="flex items-center gap-2">
              <span class={cn('truncate text-xl', styles.fgL0)}>{team.name}</span>
            </div>
            {#if options.showFlags && flagFilename}
              <div class="flex items-center gap-1.5">
                <img
                  src="/flags/{flagFilename}"
                  alt="{team.countryCode} flag"
                  class="h-5 w-auto shrink-0"
                />
                {#if options.showStatuses && team.statusText}
                  <span class={cn('text-base leading-none', styles.fgL1)}>·</span>
                  <span class={cn('truncate text-base', styles.fgL1)}>{team.statusText}</span>
                {/if}
              </div>
            {:else if options.showStatuses && team.statusText}
              <span class={cn('truncate text-base', styles.fgL1)}>{team.statusText}</span>
            {/if}
          </div>

          <div class="flex shrink-0 items-center gap-4">
            <div class="flex flex-col items-end">
              <span class="text-foreground-l1 text-xl tabular-nums">
                {team.score.toLocaleString()} <span class="text-foreground-l3 text-lg">pts</span>
              </span>
              {#if options.showSolveCount}
                <span class="text-foreground-l3 text-base">
                  {team.solveCount} solve{team.solveCount !== 1 ? 's' : ''}
                </span>
              {/if}
            </div>

            {#if options.showSparklines && team.sparklineData}
              <div class="h-10 w-24 overflow-hidden">
                <ScoresSparkline
                  data={team.sparklineData}
                  id={team.id}
                  color={team.color ?? 'var(--foreground-l3)'}
                />
              </div>
            {/if}
          </div>
        </div>

        {#if options.showMatrix && categoryGroups.length > 0}
          <div
            class={cn(
              'before:bg-background-l2 relative isolate flex h-16 items-center gap-1 rounded-r-lg pr-4 before:absolute before:inset-0 before:-z-10 before:rounded-r-lg',
              team.isCurrentUser && 'before:bg-background-self-l0'
            )}
          >
            {#each categoryGroups as group}
              {@const stats = getCategoryStats(team.id, group)}
              <div
                class="flex items-center justify-center"
                style="width: {CELL_SIZE}px; height: {CELL_SIZE}px; {getCategoryStyle(
                  group.config.color
                )}"
              >
                {#if stats.solved === stats.total}
                  <svg class="size-6.5" viewBox="0 0 24 24">
                    <path
                      fill="var(--category-foreground-l1)"
                      d="M17 3.34a10 10 0 1 1-14.995 8.984L2 12l.005-.324A10 10 0 0 1 17 3.34m-1.293 5.953a1 1 0 0 0-1.32-.083l-.094.083L11 12.585l-1.293-1.292l-.094-.083a1 1 0 0 0-1.403 1.403l.083.094l2 2l.094.083a1 1 0 0 0 1.226 0l.094-.083l4-4l.083-.094a1 1 0 0 0-.083-1.32"
                    />
                  </svg>
                {:else if stats.solved > 0}
                  {@const radius = 8}
                  {@const circumference = 2 * Math.PI * radius}
                  {@const offset = circumference * (1 - stats.percent / 100)}
                  <svg class="size-6.5 -rotate-90" viewBox="0 0 24 24">
                    <circle
                      cx="12"
                      cy="12"
                      r={radius}
                      fill="none"
                      stroke="var(--foreground-l5)"
                      stroke-opacity="0.2"
                      stroke-width="2"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r={radius}
                      fill="none"
                      stroke="var(--category-foreground-l1)"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-dasharray={circumference}
                      stroke-dashoffset={offset}
                    />
                  </svg>
                {:else}
                  <svg class="size-6.5" viewBox="0 0 24 24" style="opacity: 0.25">
                    <path
                      fill="none"
                      stroke="var(--foreground-l5)"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8.56 3.69a9 9 0 0 0-2.92 1.95M3.69 8.56A9 9 0 0 0 3 12m.69 3.44a9 9 0 0 0 1.95 2.92m2.92 1.95A9 9 0 0 0 12 21m3.44-.69a9 9 0 0 0 2.92-1.95m1.95-2.92A9 9 0 0 0 21 12m-.69-3.44a9 9 0 0 0-1.95-2.92m-2.92-1.95A9 9 0 0 0 12 3"
                    />
                  </svg>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <div class="text-foreground-l5/50 -mb-2 text-center text-sm">Powered by rCTF</div>
</div>

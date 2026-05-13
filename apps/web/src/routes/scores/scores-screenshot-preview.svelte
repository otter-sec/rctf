<script lang="ts">
  import defaultWordmarkDark from '$lib/assets/wordmark-dark.svg'
  import { useClientConfig } from '$lib/query'
  import { countryCodeToFlagFilename, getInitials, getRankVariant } from '$lib/utils'
  import { getCategoryStyle } from '$lib/utils/categories'
  import { format, formatDuration, intervalToDuration } from 'date-fns'
  import ScoresGraph from './scores-graph.svelte'
  import ScoresSparkline from './scores-sparkline.svelte'
  import type { CategoryGroup } from './types'

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
    shadow?: boolean
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
    shadow = false,
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

  const listedTopTeamIds = $derived(new Set(teams.slice(0, options.teamCount).map(t => t.id)))

  const displayTeams = $derived.by(() => {
    const limited = teams.slice(0, options.teamCount)
    if (options.showSelf && selfTeam && !listedTopTeamIds.has(selfTeam.id)) {
      return [...limited, selfTeam]
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

<screenshot-preview shadow={shadow || undefined} data-screenshot-container>
  {#if options.showHeader}
    <preview-header>
      <img src={wordmarkDark} alt="Logo" data-wordmark />
      <title-block>
        <span>{ctfName}</span>
        {#if options.subtitle}
          <small>{options.subtitle}</small>
        {/if}
        {#if ctfDateInfo}
          <time datetime={new Date(startTime ?? 0).toISOString()}>
            {ctfDateInfo.startStr} -> {ctfDateInfo.endStr}
            <span>({ctfDateInfo.durationStr})</span>
          </time>
        {/if}
      </title-block>
    </preview-header>
  {/if}

  {#if options.showGraph}
    <graph-panel>
      <ScoresGraph
        graphData={visibleGraphData}
        {teamRanks}
        {contextTeamIds}
        showTop3Context={false}
        greyOutContext={shouldGreyOutContext}
      />
    </graph-panel>
  {/if}

  <team-list>
    {#if options.showMatrix && categoryGroups.length > 0}
      <matrix-header>
        <team-spacer></team-spacer>
        <matrix-header-cells>
          {#each categoryGroups as group (group.category)}
            <matrix-header-cell
              style="{getCategoryStyle(
                group.config.color
              )}; width: {CELL_SIZE}px; height: {CELL_SIZE}px;"
            >
              <group.config.icon class="category-icon" />
            </matrix-header-cell>
          {/each}
        </matrix-header-cells>
      </matrix-header>
    {/if}

    {#each displayTeams as team (team.id)}
      {@const rankVariant = getRankVariant(team.rank, team.isCurrentUser)}
      {@const flagFilename = team.countryCode ? countryCodeToFlagFilename(team.countryCode) : null}
      {@const isSelfSeparator =
        options.showSelf && selfTeam && team.id === selfTeam.id && !listedTopTeamIds.has(team.id)}

      {#if isSelfSeparator}
        <self-separator>
          <div></div>
          <span>My team</span>
          <div></div>
        </self-separator>
      {/if}

      <preview-row rank={rankVariant} current={team.isCurrentUser || undefined}>
        <team-card with-matrix={options.showMatrix || undefined}>
          <team-rank>
            <span>#{team.rank}</span>
          </team-rank>

          {#if options.showAvatars}
            <team-avatar>
              {#if team.avatarUrl}
                <img src={team.avatarUrl} alt={team.name} />
              {:else}
                <span>{getInitials(team.name)}</span>
              {/if}
            </team-avatar>
          {/if}

          <team-text>
            <team-name>{team.name}</team-name>
            {#if options.showFlags && flagFilename}
              <team-meta>
                <img src="/flags/{flagFilename}" alt="{team.countryCode} flag" />
                {#if options.showStatuses && team.statusText}
                  <span>&middot;</span>
                  <span>{team.statusText}</span>
                {/if}
              </team-meta>
            {:else if options.showStatuses && team.statusText}
              <team-meta>{team.statusText}</team-meta>
            {/if}
          </team-text>

          <score-block>
            <score-value>
              <span>
                {team.score.toLocaleString()} <span>pts</span>
              </span>
              {#if options.showSolveCount}
                <span>{team.solveCount} solve{team.solveCount !== 1 ? 's' : ''}</span>
              {/if}
            </score-value>

            {#if options.showSparklines && team.sparklineData}
              <sparkline-slot>
                <ScoresSparkline
                  data={team.sparklineData}
                  id={team.id}
                  color={team.color ?? 'var(--foreground-l3)'}
                />
              </sparkline-slot>
            {/if}
          </score-block>
        </team-card>

        {#if options.showMatrix && categoryGroups.length > 0}
          <matrix-row current={team.isCurrentUser || undefined}>
            {#each categoryGroups as group (group.category)}
              {@const stats = getCategoryStats(team.id, group)}
              <matrix-cell
                style="width: {CELL_SIZE}px; height: {CELL_SIZE}px; {getCategoryStyle(
                  group.config.color
                )}"
              >
                {#if stats.solved === stats.total}
                  <svg viewBox="0 0 24 24">
                    <path
                      fill="var(--category-foreground-l1)"
                      d="M17 3.34a10 10 0 1 1-14.995 8.984L2 12l.005-.324A10 10 0 0 1 17 3.34m-1.293 5.953a1 1 0 0 0-1.32-.083l-.094.083L11 12.585l-1.293-1.292l-.094-.083a1 1 0 0 0-1.403 1.403l.083.094l2 2l.094.083a1 1 0 0 0 1.226 0l.094-.083l4-4l.083-.094a1 1 0 0 0-.083-1.32"
                    />
                  </svg>
                {:else if stats.solved > 0}
                  {@const radius = 8}
                  {@const circumference = 2 * Math.PI * radius}
                  {@const offset = circumference * (1 - stats.percent / 100)}
                  <svg data-partial viewBox="0 0 24 24">
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
                  <svg data-unsolved viewBox="0 0 24 24">
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
              </matrix-cell>
            {/each}
          </matrix-row>
        {/if}
      </preview-row>
    {/each}
  </team-list>

  <powered-by>Powered by rCTF</powered-by>
</screenshot-preview>

<style>
  screenshot-preview {
    width: fit-content;
    display: flex;
    flex-direction: column;
    gap: calc(var(--spacing) * 4);
    overflow: hidden;
    padding-block: calc(var(--spacing) * 6);
    padding-inline: calc(var(--spacing) * 6);
    background: var(--background-l0);

    &[shadow] {
      box-shadow: 0 1rem 2rem rgb(0 0 0 / 20%);
    }

    preview-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;

      img[data-wordmark] {
        height: 2.5rem;
      }

      title-block {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: calc(var(--spacing) * 1.5);

        > span:first-child {
          color: var(--foreground-l0);
          font-size: var(--text-2xl);
          line-height: 1;
        }

        small,
        time {
          line-height: 1;
        }

        small {
          color: var(--foreground-l2);
          font-size: var(--text-base);
        }

        time {
          color: var(--foreground-l3);

          span {
            color: var(--foreground-l4);
          }
        }
      }
    }

    graph-panel {
      --score-graph-padding: calc(var(--spacing) * 4);
      display: block;
      width: 100%;
      height: 18rem;
      overflow: hidden;
      border-radius: var(--radius-lg);
      background: var(--background-l1);
    }

    team-list {
      display: flex;
      flex-direction: column;
      gap: calc(var(--spacing) * 1);
    }

    matrix-header,
    preview-row,
    matrix-header-cells,
    team-card,
    matrix-row,
    matrix-header-cell,
    matrix-cell,
    team-meta,
    score-block,
    self-separator {
      display: flex;
    }

    matrix-header {
      margin-block-end: calc(var(--spacing) * -1);
    }

    team-spacer,
    team-card {
      width: 37.5rem;
      flex-shrink: 0;
    }

    matrix-header-cells {
      gap: calc(var(--spacing) * 1);
      padding-inline-end: calc(var(--spacing) * 4);
    }

    matrix-header-cell {
      align-items: center;
      justify-content: center;
      border-start-start-radius: var(--radius-lg);
      border-start-end-radius: var(--radius-lg);
      background: var(--category-background-l0);
    }

    :global(.category-icon) {
      width: 1.25rem;
      height: 1.25rem;
      color: var(--category-foreground-l1);
    }

    self-separator {
      align-items: center;
      gap: calc(var(--spacing) * 3);
      margin-block: calc(var(--spacing) * 2);
      color: var(--foreground-l3);
      font-size: var(--text-sm);

      div {
        flex: 1;
        border-block-start: 1px solid color-mix(in oklab, var(--foreground-l5) 30%, transparent);
      }
    }

    preview-row {
      --rank-fg-l0: var(--foreground-nth-l0);
      --rank-fg-l1: var(--foreground-nth-l1);
      --rank-glow: transparent;

      &[rank='first'] {
        --rank-fg-l0: var(--foreground-gold-l0);
        --rank-fg-l1: var(--foreground-gold-l1);
        --rank-glow: color-mix(in oklab, var(--foreground-gold-l0) 15%, transparent);
      }

      &[rank='second'] {
        --rank-fg-l0: var(--foreground-silver-l0);
        --rank-fg-l1: var(--foreground-silver-l1);
        --rank-glow: color-mix(in oklab, var(--foreground-silver-l0) 15%, transparent);
      }

      &[rank='third'] {
        --rank-fg-l0: var(--foreground-bronze-l0);
        --rank-fg-l1: var(--foreground-bronze-l1);
        --rank-glow: color-mix(in oklab, var(--foreground-bronze-l0) 15%, transparent);
      }

      &[rank='self'] {
        --rank-fg-l0: var(--foreground-self-l0);
        --rank-fg-l1: var(--foreground-self-l1);
        --rank-glow: color-mix(in oklab, var(--foreground-self-l0) 15%, transparent);
      }

      &[current] team-card,
      &[current] matrix-row {
        background: var(--background-self-l0);
      }
    }

    team-card,
    matrix-row {
      position: relative;
      isolation: isolate;
      height: 4rem;
      align-items: center;
      background: var(--background-l2);
    }

    team-card {
      gap: calc(var(--spacing) * 4);
      box-sizing: border-box;
      padding-inline: calc(var(--spacing) * 4);
      border-radius: var(--radius-lg);

      &[with-matrix] {
        border-start-end-radius: 0;
        border-end-end-radius: 0;
      }

      &::after {
        content: '';
        position: absolute;
        inset-block: 0;
        inset-inline-start: 0;
        z-index: -1;
        width: min(16rem, 100%);
        border-radius: inherit;
        background: linear-gradient(to right, var(--rank-glow), transparent);
      }
    }

    team-rank {
      width: calc(var(--spacing) * 14);
      display: flex;
      flex-shrink: 0;
      justify-content: center;
    }

    team-rank span,
    team-name {
      color: var(--rank-fg-l0);
    }

    team-rank span,
    score-value > span:first-child {
      font-size: var(--text-xl);
      font-variant-numeric: tabular-nums;
    }

    team-avatar {
      width: calc(var(--spacing) * 12);
      height: calc(var(--spacing) * 12);
      flex-shrink: 0;
      overflow: hidden;
      border-radius: var(--radius-lg);
      background: var(--background-l4);

      img,
      span {
        width: 100%;
        height: 100%;
      }

      img {
        object-fit: cover;
      }

      span {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--foreground-l3);
        font-size: var(--text-sm);
      }
    }

    team-text {
      min-width: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    team-name {
      display: block;
      overflow: hidden;
      font-size: var(--text-xl);
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    team-meta {
      min-width: 0;
      align-items: center;
      gap: calc(var(--spacing) * 1.5);
      overflow: hidden;
      color: var(--rank-fg-l1);

      img {
        width: auto;
        height: calc(var(--spacing) * 5);
        flex-shrink: 0;
      }

      span:last-child {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    score-block {
      align-items: center;
      flex-shrink: 0;
      gap: calc(var(--spacing) * 4);
    }

    score-value {
      display: flex;
      flex-direction: column;
      align-items: flex-end;

      > span:first-child {
        color: var(--foreground-l1);

        span {
          color: var(--foreground-l3);
          font-size: var(--text-lg);
        }
      }

      > span:last-child {
        color: var(--foreground-l3);
      }
    }

    sparkline-slot {
      display: block;
      width: calc(var(--spacing) * 24);
      height: calc(var(--spacing) * 10);
      overflow: hidden;
    }

    matrix-row {
      align-items: center;
      gap: calc(var(--spacing) * 1);
      padding-inline-end: calc(var(--spacing) * 4);
      border-start-end-radius: var(--radius-lg);
      border-end-end-radius: var(--radius-lg);
    }

    matrix-cell {
      align-items: center;
      justify-content: center;

      svg {
        width: 1.625rem;
        height: 1.625rem;

        &[data-partial] {
          rotate: -90deg;
        }

        &[data-unsolved] {
          opacity: 0.25;
        }
      }
    }

    powered-by {
      display: block;
      margin-block-end: calc(var(--spacing) * -2);
      color: color-mix(in oklab, var(--foreground-l5) 50%, transparent);
      text-align: center;
      font-size: var(--text-sm);
    }
  }
</style>

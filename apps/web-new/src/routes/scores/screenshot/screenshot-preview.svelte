<script lang="ts">
  import wordmarkDark from '$lib/assets/wordmark-dark.svg'
  import ScoresSparkline from '$lib/chart/sparkline.svelte'
  import { useClientConfig } from '$lib/query/config'
  import type { LeaderboardGraphSeries } from '$lib/query/leaderboard'
  import { countryCodeToFlagFilename } from '$lib/utils/flags'
  import { getInitials } from '$lib/utils/initials'
  import ScoresGraph from '../graph/graph.svelte'
  import {
    getCategoryStatsForSolves,
    getRankVariant,
    type CategoryGroup,
  } from '../model/transforms'
  import {
    buildDateRangeLabel,
    buildDurationLabel,
    deriveContextTeamIds,
    getDisplayTeamIds,
    getListedTopIds,
    getVisibleGraphIds,
    type ScreenshotOptions,
    type ScreenshotTeam,
  } from './options'

  interface Props {
    teams: ScreenshotTeam[]
    selfTeam: ScreenshotTeam | null
    graphData: LeaderboardGraphSeries[]
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

  const configQuery = useClientConfig()
  const wordmark = $derived(configQuery.data?.logoDarkUrl || wordmarkDark)

  const selfId = $derived(selfTeam?.id ?? null)
  const teamIds = $derived(teams.map(team => team.id))

  const teamById = $derived.by(() => {
    const map = new Map<string, ScreenshotTeam>()
    for (const team of teams) map.set(team.id, team)
    if (selfTeam) map.set(selfTeam.id, selfTeam)
    return map
  })

  const listedTopIds = $derived(getListedTopIds(teamIds, options.teamCount))
  const displayTeamIds = $derived(
    getDisplayTeamIds(teamIds, selfId, options.teamCount, options.showSelf)
  )
  const displayTeams = $derived(
    displayTeamIds
      .map(id => teamById.get(id))
      .filter((team): team is ScreenshotTeam => team !== undefined)
  )

  const visibleGraphIds = $derived(getVisibleGraphIds(teamIds, options.graphTeamCount))
  const graphVisibleTeamIds = $derived(new Set(visibleGraphIds))
  const graphContextTeamIds = $derived(
    deriveContextTeamIds(options, visibleGraphIds, displayTeamIds, selfId) ?? new Set<string>()
  )
  const graphTeamRanks = $derived(new Map(teams.map(team => [team.id, team.rank])))

  const dateInfo = $derived.by(() => {
    if (startTime === null || endTime === null) return null
    return {
      range: buildDateRangeLabel(startTime, endTime),
      duration: buildDurationLabel(startTime, endTime),
    }
  })
</script>

<screenshot-preview data-shadow={shadow || undefined} data-screenshot-container>
  {#if options.showHeader}
    <preview-header>
      <img src={wordmark} alt="Logo" data-wordmark />
      <title-block>
        <ctf-name>{ctfName}</ctf-name>
        {#if options.subtitle}
          <subtitle-text>{options.subtitle}</subtitle-text>
        {/if}
        {#if dateInfo}
          <date-range>
            {dateInfo.range}
            {#if dateInfo.duration}<span>({dateInfo.duration})</span>{/if}
          </date-range>
        {/if}
      </title-block>
    </preview-header>
  {/if}

  {#if options.showGraph}
    <graph-panel>
      <ScoresGraph
        {graphData}
        visibleTeamIds={graphVisibleTeamIds}
        contextTeamIds={graphContextTeamIds}
        teamRanks={graphTeamRanks}
        {selfId}
        startTime={startTime ?? 0}
        hoveredTeamId={null}
        solveHighlight={null}
        showTop3Context={false}
        showSelfContext={false}
        onToggleTop3={() => {}}
        onToggleSelf={() => {}}
      />
    </graph-panel>
  {/if}

  <team-list>
    {#if options.showMatrix && categoryGroups.length > 0}
      <matrix-header>
        <team-spacer></team-spacer>
        <matrix-header-cells>
          {#each categoryGroups as group (group.category)}
            <matrix-header-cell data-category-color={group.config.color}>
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
        options.showSelf && team.id === selfId && !listedTopIds.has(team.id)}

      {#if isSelfSeparator}
        <self-separator>
          <hr />
          <span>My team</span>
          <hr />
        </self-separator>
      {/if}

      <preview-row data-rank={rankVariant} data-current={team.isCurrentUser || undefined}>
        <team-card data-with-matrix={options.showMatrix || undefined}>
          <team-rank><span>#{team.rank}</span></team-rank>

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
            {#if options.showFlags && flagFilename && team.countryCode}
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
              <strong>{team.score.toLocaleString()} <span>pts</span></strong>
              {#if options.showSolveCount}
                <small>{team.solveCount} solve{team.solveCount === 1 ? '' : 's'}</small>
              {/if}
            </score-value>

            {#if options.showSparklines && team.sparklineData.length > 0}
              <sparkline-slot>
                <ScoresSparkline data={team.sparklineData} id={team.id} color={team.color} />
              </sparkline-slot>
            {/if}
          </score-block>
        </team-card>

        {#if options.showMatrix && categoryGroups.length > 0}
          <matrix-row data-current={team.isCurrentUser || undefined}>
            {#each categoryGroups as group (group.category)}
              {@const stats = getCategoryStatsForSolves(solvesByTeam.get(team.id) ?? null, group)}
              <matrix-cell data-category-color={group.config.color}>
                {#if stats.total === 0}
                  <svg data-unsolved viewBox="0 0 24 24">
                    <path
                      fill="none"
                      stroke="var(--foreground-l5)"
                      stroke-linecap="round"
                      stroke-width="2"
                      d="M7 12h10"
                    />
                  </svg>
                {:else if stats.state === 'full'}
                  <svg viewBox="0 0 24 24">
                    <path
                      fill="var(--category-foreground-l1)"
                      d="M17 3.34a10 10 0 1 1-14.995 8.984L2 12l.005-.324A10 10 0 0 1 17 3.34m-1.293 5.953a1 1 0 0 0-1.32-.083l-.094.083L11 12.585l-1.293-1.292l-.094-.083a1 1 0 0 0-1.403 1.403l.083.094l2 2l.094.083a1 1 0 0 0 1.226 0l.094-.083l4-4l.083-.094a1 1 0 0 0-.083-1.32"
                    />
                  </svg>
                {:else if stats.state === 'partial'}
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
    display: flex;
    inline-size: fit-content;
    flex-direction: column;
    gap: 1rem;
    overflow: hidden;
    padding: 1.5rem;
    background: var(--background-l0);

    &[data-shadow] {
      box-shadow: 0 1rem 2rem rgb(0 0 0 / 20%);
    }
  }

  preview-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;

    img[data-wordmark] {
      block-size: 2.5rem;
    }
  }

  title-block {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.375rem;
  }

  ctf-name {
    color: var(--foreground-l0);
    font-size: 1.5rem;
    line-height: 1;
  }

  subtitle-text {
    color: var(--foreground-l2);
    font-size: 1rem;
    line-height: 1;
  }

  date-range {
    color: var(--foreground-l3);
    font-size: 0.875rem;
    line-height: 1;

    span {
      color: var(--foreground-l4);
    }
  }

  graph-panel {
    display: block;
    inline-size: 100%;
    block-size: 18rem;
    overflow: hidden;
    border-radius: var(--radius-lg);
    background: var(--background-l1);
  }

  team-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  matrix-header {
    display: flex;
    margin-block-end: -0.25rem;
  }

  team-spacer,
  team-card {
    inline-size: 37.5rem;
    flex-shrink: 0;
  }

  matrix-header-cells {
    display: flex;
    gap: 0.25rem;
    padding-inline-end: 1rem;
  }

  matrix-header-cell {
    display: flex;
    inline-size: 2.5rem;
    block-size: 2.5rem;
    align-items: center;
    justify-content: center;
    border-start-start-radius: var(--radius-lg);
    border-start-end-radius: var(--radius-lg);
    background: var(--category-background-l0);
  }

  :global(.category-icon) {
    inline-size: 1.25rem;
    block-size: 1.25rem;
    color: var(--category-foreground-l1);
  }

  self-separator {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-block: 0.5rem;
    color: var(--foreground-l3);
    font-size: 0.875rem;

    hr {
      flex: 1;
      block-size: 0;
      border: none;
      border-block-start: 1px solid color-mix(in oklab, var(--foreground-l5) 30%, transparent);
    }
  }

  preview-row {
    --rank-fg-l0: var(--foreground-nth-l0);
    --rank-fg-l1: var(--foreground-nth-l1);
    --rank-glow: transparent;
    display: flex;

    &[data-rank='first'] {
      --rank-fg-l0: var(--foreground-gold-l0);
      --rank-fg-l1: var(--foreground-gold-l1);
      --rank-glow: color-mix(in oklab, var(--foreground-gold-l0) 15%, transparent);
    }

    &[data-rank='second'] {
      --rank-fg-l0: var(--foreground-silver-l0);
      --rank-fg-l1: var(--foreground-silver-l1);
      --rank-glow: color-mix(in oklab, var(--foreground-silver-l0) 15%, transparent);
    }

    &[data-rank='third'] {
      --rank-fg-l0: var(--foreground-bronze-l0);
      --rank-fg-l1: var(--foreground-bronze-l1);
      --rank-glow: color-mix(in oklab, var(--foreground-bronze-l0) 15%, transparent);
    }

    &[data-rank='self'] {
      --rank-fg-l0: var(--foreground-self-l0);
      --rank-fg-l1: var(--foreground-self-l1);
      --rank-glow: color-mix(in oklab, var(--foreground-self-l0) 15%, transparent);
    }

    &[data-current] team-card,
    &[data-current] matrix-row {
      background: var(--background-self-l0);
    }
  }

  team-card,
  matrix-row {
    position: relative;
    isolation: isolate;
    display: flex;
    block-size: 4rem;
    align-items: center;
    background: var(--background-l2);
  }

  team-card {
    gap: 1rem;
    box-sizing: border-box;
    padding-inline: 1rem;
    border-radius: var(--radius-lg);

    &[data-with-matrix] {
      border-start-end-radius: 0;
      border-end-end-radius: 0;
    }

    &::after {
      content: '';
      position: absolute;
      inset-block: 0;
      inset-inline-start: 0;
      z-index: -1;
      inline-size: min(16rem, 100%);
      border-radius: inherit;
      background: linear-gradient(to right, var(--rank-glow), transparent);
    }
  }

  team-rank {
    display: flex;
    inline-size: 3.5rem;
    flex-shrink: 0;
    justify-content: center;

    span {
      color: var(--rank-fg-l0);
      font-size: 1.25rem;
      font-variant-numeric: tabular-nums;
    }
  }

  team-avatar {
    inline-size: 3rem;
    block-size: 3rem;
    flex-shrink: 0;
    overflow: hidden;
    border-radius: var(--radius-lg);
    background: var(--background-l4);

    img,
    span {
      inline-size: 100%;
      block-size: 100%;
    }

    img {
      object-fit: cover;
    }

    span {
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--foreground-l3);
      font-size: 0.875rem;
    }
  }

  team-text {
    display: flex;
    min-inline-size: 0;
    flex: 1;
    flex-direction: column;
  }

  team-name {
    display: block;
    overflow: hidden;
    color: var(--rank-fg-l0);
    font-size: 1.25rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  team-meta {
    display: flex;
    min-inline-size: 0;
    align-items: center;
    gap: 0.375rem;
    overflow: hidden;
    color: var(--rank-fg-l1);

    img {
      inline-size: auto;
      block-size: 1.25rem;
      flex-shrink: 0;
    }

    span:last-child {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  score-block {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 1rem;
  }

  score-value {
    display: flex;
    flex-direction: column;
    align-items: flex-end;

    strong {
      color: var(--foreground-l1);
      font-weight: 400;
      font-size: 1.25rem;
      font-variant-numeric: tabular-nums;

      span {
        color: var(--foreground-l3);
        font-size: 1.125rem;
      }
    }

    small {
      color: var(--foreground-l3);
    }
  }

  sparkline-slot {
    display: block;
    inline-size: 6rem;
    block-size: 2.5rem;
    overflow: hidden;
  }

  matrix-row {
    gap: 0.25rem;
    padding-inline-end: 1rem;
    border-start-end-radius: var(--radius-lg);
    border-end-end-radius: var(--radius-lg);
  }

  matrix-cell {
    display: flex;
    inline-size: 2.5rem;
    block-size: 2.5rem;
    align-items: center;
    justify-content: center;

    svg {
      inline-size: 1.625rem;
      block-size: 1.625rem;

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
    margin-block-end: -0.5rem;
    color: color-mix(in oklab, var(--foreground-l5) 50%, transparent);
    text-align: center;
    font-size: 0.875rem;
  }
</style>

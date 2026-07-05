<script lang="ts">
  import type { LeaderboardEntry } from '$lib/query/leaderboard'
  import Avatar from '$lib/ui/avatar.svelte'
  import { countryCodeToFlagFilename } from '$lib/utils/flags'
  import type { ScoresData } from './scores-data.svelte'
  import ScoresDelta from './scores-delta.svelte'
  import ScoresSparkline from './scores-sparkline.svelte'
  import { getVisibleSolveCount } from './scores-transforms'

  interface Props {
    data: ScoresData
    entry: LeaderboardEntry
    index: number
    divisions: Record<string, string>
    showDivision: boolean
  }

  let { data, entry, index, divisions, showDivision }: Props = $props()

  const rank = $derived(entry.globalPlace ?? index + 1)
  const delta = $derived(data.rankDeltaByTeam.get(entry.id))
  const color = $derived(data.teamColorMap.get(entry.id) ?? 'var(--foreground-l3)')
  const sparkline = $derived(data.sparklineDataByTeam.get(entry.id) ?? [])
  const solveCount = $derived(getVisibleSolveCount(entry.solves, data.challengesData))
  const flagFilename = $derived(
    entry.countryCode ? countryCodeToFlagFilename(entry.countryCode) : null
  )
  const divisionName = $derived(
    showDivision && entry.division ? divisions[entry.division] : undefined
  )
</script>

<rank-cluster>
  <delta-slot>
    <ScoresDelta {delta} />
  </delta-slot>
  <team-rank>
    <strong>#{rank}</strong>
    {#if showDivision && entry.divisionPlace}
      <small title={divisionName}>#{entry.divisionPlace}</small>
    {/if}
  </team-rank>
</rank-cluster>

<team-avatar>
  {#key entry.id}
    <Avatar src={entry.avatarUrl} name={entry.name} />
  {/key}
</team-avatar>

<team-text>
  <team-name>
    <a href="/profile/{entry.id}">{entry.name}</a>
  </team-name>
  <team-meta>
    {#if flagFilename && entry.countryCode}
      <img
        src="/flags/{flagFilename}"
        alt="{entry.countryCode} flag"
        title={entry.countryCode}
        data-flag
        decoding="async"
        draggable="false"
      />
    {/if}
    {#if flagFilename && entry.countryCode && entry.statusText}
      <span data-sep>&middot;</span>
    {/if}
    {#if entry.statusText}
      <status-text>{entry.statusText}</status-text>
    {/if}
  </team-meta>
</team-text>

<score-total>
  <score-points>
    <strong>{entry.score.toLocaleString()} <span>pts</span></strong>
    <small>{solveCount} solve{solveCount === 1 ? '' : 's'}</small>
  </score-points>
  <spark-slot>
    <ScoresSparkline data={sparkline} id={entry.id} {color} />
  </spark-slot>
</score-total>

<style>
  rank-cluster,
  team-meta,
  score-total {
    display: flex;
    align-items: center;
  }

  rank-cluster,
  score-total {
    flex-shrink: 0;
  }

  delta-slot {
    display: none;
    inline-size: 1.5rem;
  }

  team-rank {
    display: flex;
    flex-direction: column;
    align-items: center;
    inline-size: 2.5rem;
    line-height: 1;

    strong {
      color: var(--rank-fg-l0, var(--foreground-l0));
      font-weight: 400;
      font-variant-numeric: tabular-nums;
    }

    small {
      color: var(--foreground-l3);
      font-size: var(--step--2);
      font-variant-numeric: tabular-nums;
    }
  }

  team-avatar {
    --avatar-size: 2.75rem;
    flex-shrink: 0;
  }

  team-text {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-inline-size: 0;
    overflow: hidden;
  }

  team-name {
    display: flex;
    align-items: center;
    gap: var(--space-3xs);

    a {
      overflow: hidden;
      color: var(--rank-fg-l0, var(--foreground-l0));
      font-size: var(--step-1);
      white-space: nowrap;
      text-overflow: ellipsis;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  team-meta {
    min-inline-size: 0;
    gap: var(--space-3xs);

    img[data-flag] {
      inline-size: 1.25rem;
      min-inline-size: 1.25rem;
      block-size: 1.25rem;
      flex-shrink: 0;
    }

    span[data-sep] {
      flex-shrink: 0;
      color: var(--rank-fg-l1, var(--foreground-l3));
    }

    status-text {
      display: block;
      overflow: hidden;
      color: var(--rank-fg-l1, var(--foreground-l3));
      font-size: var(--step--1);
      white-space: nowrap;
      text-overflow: ellipsis;
    }
  }

  score-total {
    gap: var(--space-xs);
  }

  score-points {
    display: flex;
    flex-direction: column;
    align-items: flex-end;

    strong {
      color: var(--foreground-l1);
      font-weight: 400;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;

      span {
        color: var(--foreground-l3);
      }
    }

    small {
      color: var(--foreground-l3);
      font-size: var(--step--1);
      white-space: nowrap;
    }
  }

  spark-slot {
    display: none;
  }

  @media (width >= 80rem) {
    delta-slot {
      display: block;
    }

    spark-slot {
      display: block;
    }
  }
</style>

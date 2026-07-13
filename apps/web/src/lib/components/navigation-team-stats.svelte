<script lang="ts">
  import { getTimeOrdinal } from '@rctf/util'
  import { useLeaderboard, useSelfUserGraph } from '$lib/query/leaderboard'
  import { useCurrentUser } from '$lib/query/user'

  const SPARKLINE_WINDOW = 12 * 60 * 60 * 1000

  const userQuery = useCurrentUser()
  const user = $derived(userQuery.data)
  const globalPlace = $derived(user?.globalPlace ?? null)

  const leaderboardQuery = useLeaderboard(() => ({ limit: 1, offset: 0 }))
  const totalTeams = $derived(leaderboardQuery.data?.total ?? null)

  const graphQuery = useSelfUserGraph(
    () => globalPlace,
    () => user?.id ?? null
  )

  const points = $derived.by(() => {
    const all = graphQuery.data?.points ?? []
    if (all.length === 0) return []
    const maxTime = Math.max(...all.map(point => point.time))
    return all.filter(point => point.time >= maxTime - SPARKLINE_WINDOW)
  })

  const path = $derived.by(() => {
    if (points.length < 2) return null
    const times = points.map(point => point.time)
    const scores = points.map(point => point.score)
    const minTime = Math.min(...times)
    const timeSpan = Math.max(...times) - minTime || 1
    const minScore = Math.min(...scores)
    const scoreSpan = Math.max(...scores) - minScore || 1
    return points
      .map((point, index) => {
        const x = ((point.time - minTime) / timeSpan) * 100
        const y = 4 + (1 - (point.score - minScore) / scoreSpan) * 32
        return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
      })
      .join(' ')
  })

  const placeVariant = $derived(
    globalPlace === 1
      ? 'gold'
      : globalPlace === 2
        ? 'silver'
        : globalPlace === 3
          ? 'bronze'
          : 'nth'
  )

  const gradientId = $props.id()
</script>

{#if user && globalPlace}
  <nav-team-stats data-place={placeVariant}>
    <team-place>
      <place-ordinal>{getTimeOrdinal(globalPlace)}</place-ordinal>
      {#if totalTeams !== null}
        <place-total>of {totalTeams.toLocaleString()}</place-total>
      {/if}
    </team-place>
    {#if path}
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" />
            <stop offset="100%" />
          </linearGradient>
        </defs>
        <path
          d={path}
          stroke="url(#{gradientId})"
          vector-effect="non-scaling-stroke"
        />
      </svg>
    {:else}
      <sparkline-placeholder></sparkline-placeholder>
    {/if}
  </nav-team-stats>
{/if}

<style>
  nav-team-stats {
    --sparkline-stroke: var(--foreground-l3);
    --stat-strong: var(--foreground-l0);
    --stat-soft: var(--foreground-l3);

    display: flex;
    gap: var(--space-2xs);
    align-items: center;
    block-size: 3rem;
    inline-size: 10rem;
    overflow: hidden;
    padding-inline: var(--space-s) var(--space-2xs);
    background: var(--background-l2);
    border-radius: var(--radius-lg);

    &[data-place='gold'] {
      --sparkline-stroke: var(--foreground-gold-l0);
      --stat-strong: var(--foreground-gold-l0);
      --stat-soft: var(--foreground-gold-l1);

      background: var(--background-gold);
    }

    &[data-place='silver'] {
      --sparkline-stroke: var(--foreground-silver-l0);
      --stat-strong: var(--foreground-silver-l0);
      --stat-soft: var(--foreground-silver-l1);

      background: var(--background-silver);
    }

    &[data-place='bronze'] {
      --sparkline-stroke: var(--foreground-bronze-l0);
      --stat-strong: var(--foreground-bronze-l0);
      --stat-soft: var(--foreground-bronze-l1);

      background: var(--background-bronze);
    }

    @media (width < 64rem) {
      display: none;
    }
  }

  team-place {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }

  place-ordinal {
    display: block;
    color: var(--stat-strong);
    white-space: nowrap;
  }

  place-total {
    display: block;
    font-size: 0.75rem;
    color: var(--stat-soft);
    white-space: nowrap;
  }

  svg {
    flex: 1;
    min-inline-size: 0;
    block-size: 2.5rem;

    path {
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    stop {
      stop-color: var(--sparkline-stroke);

      &:first-of-type {
        stop-opacity: 0;
      }
    }
  }

  sparkline-placeholder {
    display: block;
    flex: 1;
    block-size: 2px;
    background: linear-gradient(
      to right,
      transparent,
      color-mix(in oklab, var(--foreground-l5) 20%, transparent)
    );
    border-radius: var(--radius-full);
  }
</style>

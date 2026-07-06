<!--
  Trailing cell shared by the scores-tab list rows and the pinned self row:
  the points value with its delta chip, plus the team's 12h sparkline in its
  series colour.
-->
<script lang="ts">
  import Sparkline, { type SparklinePoint } from '$lib/chart/sparkline.svelte'
  import ChallengePointDelta from './challenges-point-delta.svelte'

  interface Props {
    points: number
    delta: number | undefined
    /** Series colour role, matching the team's graph line. */
    role: string
    sparkline: SparklinePoint[]
    /** Also the SVG gradient id — must be unique per rendered sparkline. */
    sparklineId: string
  }

  let { points, delta, role, sparkline, sparklineId }: Props = $props()
</script>

<score-trailing>
  <score-cell>
    <score-points>{points.toLocaleString()} pts</score-points>
    <ChallengePointDelta {delta} />
  </score-cell>
  <spark-slot data-series-role={role}>
    <Sparkline data={sparkline} id={sparklineId} color="currentColor" />
  </spark-slot>
</score-trailing>

<style>
  score-trailing {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  score-cell {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }

  score-points {
    font-size: 1.125rem;
    font-variant-numeric: tabular-nums;
    color: var(--foreground-l1);
    white-space: nowrap;

    @media (width >= 40rem) {
      font-size: 1.25rem;
    }
  }

  /* The sparkline inherits its series colour from data-series-role (the same
     ramp the graph lines use) and, like /scores, only shows on wider rows. */
  spark-slot {
    display: none;

    @media (width >= 40rem) {
      display: block;
    }
  }
</style>

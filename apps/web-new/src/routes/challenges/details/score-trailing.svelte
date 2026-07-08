<script lang="ts">
  import Sparkline, { type SparklinePoint } from '$lib/chart/sparkline.svelte'
  import ChallengePointDelta from '../model/point-delta.svelte'

  interface Props {
    points: number
    delta: number | undefined
    role: string
    sparkline: SparklinePoint[]
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

  spark-slot {
    display: none;

    @media (width >= 40rem) {
      display: block;
    }
  }
</style>

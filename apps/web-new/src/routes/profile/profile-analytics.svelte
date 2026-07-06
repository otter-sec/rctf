<!--
  Analytics column for the profile routes. Stacks the analytics chart sections;
  for now that is only the score-over-time graph. U13 appends the four remaining
  charts (category, timeline, cadence, difficulty) as further stacked sections,
  so this stays a plain vertical container to keep that growth one <Section> at a
  time.
-->
<script lang="ts">
  import Section from '$lib/ui/section.svelte'
  import type { ProfileDynamicScore, ProfileSolve } from './profile-analytics-data'
  import type { GraphSampleInput } from './profile-graph-data'
  import ProfileGraph from './profile-graph.svelte'

  type Props = {
    solves: ProfileSolve[]
    dynamicScores: ProfileDynamicScore[]
    graphData: GraphSampleInput
    startTime: number
    endTime: number
    splitDynamicScore?: boolean
  }

  let {
    solves,
    dynamicScores,
    graphData,
    startTime,
    endTime,
    splitDynamicScore = false,
  }: Props = $props()
</script>

<profile-analytics>
  <Section title="Score over time">
    <graph-frame>
      <ProfileGraph
        {graphData}
        {solves}
        {dynamicScores}
        {startTime}
        {endTime}
        {splitDynamicScore}
      />
    </graph-frame>
  </Section>
</profile-analytics>

<style>
  profile-analytics {
    display: flex;
    flex-direction: column;
    gap: var(--space-m);
  }

  graph-frame {
    display: block;
    block-size: 11rem;
  }
</style>

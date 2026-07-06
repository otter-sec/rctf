<!--
  Analytics column for the profile routes. Stacks the analytics chart sections:
  the score-over-time graph, then the four tail charts (points by category,
  solve timeline, solve cadence, difficulty profile). Chart inputs are derived
  here from the shared props via the tested profile-analytics-data builders; the
  charts themselves are rendering-only. `challenges` is optional so a caller that
  lacks the board snapshot still renders — the category and difficulty charts
  fall back to their track-only/empty states.
-->
<script lang="ts">
  import type { ClientConfig } from '@rctf/types'
  import Section from '$lib/ui/section.svelte'
  import {
    buildActivityDomain,
    buildCadenceData,
    buildCategoryPointsData,
    buildCategoryStats,
    buildDifficultyData,
    buildTimelineCategories,
    buildTimelineData,
    isDynamicChallenge,
    sortProfileSolves,
    type ChallengeInfo,
    type ProfileDynamicScore,
    type ProfileSolve,
  } from './profile-analytics-data'
  import ProfileCadenceChart from './profile-cadence-chart.svelte'
  import ProfileCategoryChart from './profile-category-chart.svelte'
  import ProfileDifficultyChart from './profile-difficulty-chart.svelte'
  import type { GraphSampleInput } from './profile-graph-data'
  import ProfileGraph from './profile-graph.svelte'
  import ProfileTimelineChart from './profile-timeline-chart.svelte'

  type Props = {
    solves: ProfileSolve[]
    dynamicScores: ProfileDynamicScore[]
    graphData: GraphSampleInput
    clientConfig: ClientConfig
    challenges?: ChallengeInfo[] | null
    splitDynamicScore?: boolean
  }

  let {
    solves,
    dynamicScores,
    graphData,
    clientConfig,
    challenges = null,
    splitDynamicScore = false,
  }: Props = $props()

  const startTime = $derived(clientConfig.startTime)
  const endTime = $derived(clientConfig.endTime)

  const boardChallenges = $derived(challenges ?? [])
  const staticChallenges = $derived(
    boardChallenges.filter(challenge => !isDynamicChallenge(challenge))
  )
  const sortedSolves = $derived(sortProfileSolves(solves))

  const categoryStats = $derived(
    buildCategoryStats({ challenges: boardChallenges, dynamicScores, solves: sortedSolves })
  )
  const categoryPointsData = $derived(
    buildCategoryPointsData(categoryStats, sortedSolves, boardChallenges, dynamicScores)
  )
  const difficultyData = $derived(
    buildDifficultyData({ challenges: staticChallenges, solves: sortedSolves })
  )
  const activityDomain = $derived(buildActivityDomain({ clientConfig, solves: sortedSolves }))
  const cadenceData = $derived(
    buildCadenceData({ ctfStart: startTime, domain: activityDomain, solves: sortedSolves })
  )
  const timelineData = $derived(buildTimelineData(sortedSolves))
  const timelineCategories = $derived(buildTimelineCategories(timelineData, categoryStats))
</script>

<profile-analytics>
  <Section title="Score over time">
    <graph-frame>
      <ProfileGraph
        {graphData}
        solves={sortedSolves}
        {dynamicScores}
        {startTime}
        {endTime}
        {splitDynamicScore}
      />
    </graph-frame>
  </Section>

  <Section title="Points by category">
    <ProfileCategoryChart data={categoryPointsData} emptyMessage="No points data." />
  </Section>

  <Section title="Solve timeline">
    <ProfileTimelineChart
      data={timelineData}
      categories={timelineCategories}
      {activityDomain}
      {startTime}
    />
  </Section>

  <Section title="Solve cadence">
    <ProfileCadenceChart data={cadenceData} ctfStart={startTime} />
  </Section>

  <Section title="Difficulty profile">
    <ProfileDifficultyChart data={difficultyData} />
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

<script lang="ts">
  import type { ClientConfig } from '@rctf/types'
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
  } from './analytics-data'
  import ProfileCadenceChart from './cadence-chart.svelte'
  import ProfileCategoryChart from './category-chart.svelte'
  import ProfileDifficultyChart from './difficulty-chart.svelte'
  import type { GraphSampleInput } from './graph-data'
  import ProfileGraph from './graph.svelte'
  import ProfileTimelineChart from './timeline-chart.svelte'

  type Props = {
    solves: ProfileSolve[]
    dynamicScores: ProfileDynamicScore[]
    graphData: GraphSampleInput | null
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
  <section>
    <h2>Score over time</h2>
    <graph-frame>
      <ProfileGraph
        graphData={graphData ?? { points: [] }}
        solves={graphData ? sortedSolves : []}
        {dynamicScores}
        {startTime}
        {endTime}
        {splitDynamicScore}
      />
    </graph-frame>
  </section>

  <section>
    <h2>Points by category</h2>
    <ProfileCategoryChart data={categoryPointsData} emptyMessage="No points data." />
  </section>

  <section>
    <h2>Solve timeline</h2>
    <ProfileTimelineChart
      data={timelineData}
      categories={timelineCategories}
      {activityDomain}
      {startTime}
    />
  </section>

  <section>
    <h2>Solve cadence</h2>
    <ProfileCadenceChart data={cadenceData} ctfStart={startTime} />
  </section>

  <section>
    <h2>Difficulty profile</h2>
    <ProfileDifficultyChart data={difficultyData} />
  </section>
</profile-analytics>

<style>
  profile-analytics {
    display: flex;
    flex-direction: column;
  }

  section {
    padding-block: var(--space-s);
    border-block-end: 1px solid color-mix(in srgb, var(--border) 50%, transparent);

    &:first-child {
      padding-block-start: 0;
    }

    &:last-child {
      padding-block-end: 0;
      border-block-end: none;
    }
  }

  h2 {
    margin: 0 0 var(--space-xs);
    font-size: var(--step--1);
    font-weight: var(--font-weight-normal);
    color: var(--foreground-l1);
  }

  graph-frame {
    display: block;
    block-size: 11rem;
  }
</style>

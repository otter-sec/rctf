<script lang="ts">
  import type { ClientConfig, LeaderboardGraphEntry, PublicUserProfile } from '@rctf/types'
  import { cn } from '$lib/utils'
  import {
    buildActivityDomain,
    buildCadenceData,
    buildCategoryCompletionData,
    buildCategoryPointsData,
    buildCategoryStats,
    buildDifficultyData,
    buildTimelineCategories,
    buildTimelineData,
    sortProfileSolves,
    type ChallengeInfo,
  } from './profile-analytics-data'
  import ProfileAnalyticsSection from './profile-analytics-section.svelte'
  import ProfileCadenceChart from './profile-cadence-chart.svelte'
  import ProfileCategoryChart from './profile-category-chart.svelte'
  import ProfileDifficultyChart from './profile-difficulty-chart.svelte'
  import ProfileGraph from './profile-graph.svelte'
  import ProfileTimelineChart from './profile-timeline-chart.svelte'

  interface Props {
    user: PublicUserProfile
    clientConfig: ClientConfig
    challenges: ChallengeInfo[]
    graphData: LeaderboardGraphEntry | null
    class?: string
  }

  let { user, clientConfig, challenges, graphData, class: className = '' }: Props = $props()

  const sortedSolves = $derived(sortProfileSolves(user.solves))
  const categoryStats = $derived(buildCategoryStats({ challenges, solves: sortedSolves }))
  const categoryCompletionData = $derived(buildCategoryCompletionData(categoryStats))
  const categoryPointsData = $derived(buildCategoryPointsData(categoryStats))
  const difficultyData = $derived(buildDifficultyData({ challenges, solves: sortedSolves }))
  const activityDomain = $derived(buildActivityDomain({ clientConfig, solves: sortedSolves }))
  const cadenceData = $derived(
    buildCadenceData({
      ctfStart: clientConfig.startTime,
      domain: activityDomain,
      solves: sortedSolves,
    })
  )
  const timelineData = $derived(buildTimelineData(sortedSolves))
  const timelineCategories = $derived(buildTimelineCategories(timelineData, categoryStats))
</script>

<div class={cn('flex flex-col', className)}>
  <ProfileAnalyticsSection title="Score over time">
    {#if graphData && (graphData.points.length > 0 || sortedSolves.length > 0)}
      <ProfileGraph
        class="h-44 w-full"
        {graphData}
        solves={sortedSolves}
      />
    {:else}
      <p class="text-foreground-l5 py-8 text-center text-sm">No score graph data.</p>
    {/if}
  </ProfileAnalyticsSection>

  <ProfileAnalyticsSection title="Category completion">
    <ProfileCategoryChart
      data={categoryCompletionData}
      stats={categoryStats}
      emptyMessage="No category data."
    />
  </ProfileAnalyticsSection>

  <ProfileAnalyticsSection title="Points by category">
    <ProfileCategoryChart
      data={categoryPointsData}
      stats={categoryStats}
      emptyMessage="No points data."
    />
  </ProfileAnalyticsSection>

  <ProfileAnalyticsSection title="Solve timeline">
    <ProfileTimelineChart
      data={timelineData}
      categories={timelineCategories}
      stats={categoryStats}
      {activityDomain}
      {clientConfig}
    />
  </ProfileAnalyticsSection>

  <ProfileAnalyticsSection title="Solve cadence">
    <ProfileCadenceChart data={cadenceData} ctfStart={clientConfig.startTime} />
  </ProfileAnalyticsSection>

  <ProfileAnalyticsSection title="Difficulty profile" last>
    <ProfileDifficultyChart data={difficultyData} />
  </ProfileAnalyticsSection>
</div>

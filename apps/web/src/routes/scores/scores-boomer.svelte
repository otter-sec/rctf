<script lang="ts">
  import { ScrollArea } from '$lib/components'
  import { useCurrentUser } from '$lib/query'
  import Header from './scores-boomer-header.svelte'
  import Row from './scores-boomer-row.svelte'
  import Graph from './scores-graph.svelte'
  import {
    buildSolvesMap,
    groupByCategory,
    PAGE_SIZE,
    processChallenges,
    TEAM_COL_WIDTH,
    type ChallengesData,
    type LeaderboardEntry,
  } from './types'

  const BOOMER_HEADER_HEIGHT = 44

  interface Props {
    entries: LeaderboardEntry[]
    challengesData: ChallengesData
    page: number
  }

  let { entries, challengesData, page }: Props = $props()

  const userQuery = useCurrentUser()

  let viewportRef = $state<HTMLElement | null>(null)
  let hoveredTeamId = $state<string | null>(null)

  const challenges = $derived(processChallenges(challengesData))
  const categoryGroups = $derived(groupByCategory(challenges))
  const solvesByTeam = $derived(buildSolvesMap(entries))
</script>

<div class="flex justify-center">
  <div class="flex w-fit flex-col">
    <div class="mb-4">
      <Graph
        class="h-48 w-full rounded-lg"
        {hoveredTeamId}
        offset={(page - 1) * PAGE_SIZE}
      />
    </div>

    <ScrollArea
      class="h-[calc(100vh-350px)] rounded-lg"
      orientation="both"
      scrollbarYClasses="z-50"
      scrollbarYStyles="margin-top: {BOOMER_HEADER_HEIGHT}px; height: calc(100% - {BOOMER_HEADER_HEIGHT}px);"
      bind:viewportRef
    >
      <Header {categoryGroups} teamColWidth={TEAM_COL_WIDTH} />

      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="flex flex-col gap-1"
        onmouseleave={() => (hoveredTeamId = null)}
      >
        {#each entries as entry, index (entry.id)}
          {@const rank = (page - 1) * PAGE_SIZE + index + 1}
          <Row
            {entry}
            {rank}
            {categoryGroups}
            solves={solvesByTeam.get(entry.id)!}
            isCurrentUser={$userQuery.data?.id === entry.id}
            teamColWidth={TEAM_COL_WIDTH}
            onHover={() => (hoveredTeamId = entry.id)}
          />
        {/each}
      </div>
    </ScrollArea>
  </div>
</div>


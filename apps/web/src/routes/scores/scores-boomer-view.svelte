<script lang="ts">
  import { ScrollArea } from '$lib/components'
  import { useCurrentUser } from '$lib/query'
  import { getCategoryConfig, getCategoryOrder } from '$lib/utils/categories'
  import BoomerHeader from './scores-boomer-header.svelte'
  import BoomerRow from './scores-boomer-row.svelte'
  import Graph from './scores-graph.svelte'
  import {
    PAGE_SIZE,
    TEAM_COL_WIDTH,
    type CategoryGroup,
    type Challenge,
    type LeaderboardEntry,
  } from './types'

  const BOOMER_HEADER_HEIGHT = 44

  interface Props {
    entries: LeaderboardEntry[]
    challengesData: Record<
      string,
      {
        name: string
        category: string
        points: number
        solves: number
        firstSolvers?: { id: string }[]
      }
    >
    page: number
  }

  let { entries, challengesData, page }: Props = $props()

  const userQuery = useCurrentUser()

  let viewportRef = $state<HTMLElement | null>(null)
  let hoveredTeamId = $state<string | null>(null)

  const challenges = $derived.by((): Challenge[] => {
    if (!challengesData) return []

    const mapped = Object.entries(challengesData).map(([id, info]) => {
      const config = getCategoryConfig(info.category)
      return {
        id,
        ...info,
        order: getCategoryOrder(info.category),
        config,
      }
    })

    return mapped.sort((a, b) => {
      if (a.order !== b.order) {
        if (a.order === -1 && b.order === -1)
          return a.category.localeCompare(b.category)
        if (a.order === -1) return 1
        if (b.order === -1) return -1
        return a.order - b.order
      }
      if (a.category !== b.category) return a.category.localeCompare(b.category)
      return b.points - a.points || a.name.localeCompare(b.name)
    })
  })

  const categoryGroups = $derived.by((): CategoryGroup[] => {
    const groups: CategoryGroup[] = []

    for (const challenge of challenges) {
      const last = groups.at(-1)
      if (last?.category === challenge.category) {
        last.challenges.push(challenge)
      } else {
        groups.push({
          category: challenge.category,
          config: challenge.config,
          challenges: [challenge],
        })
      }
    }
    return groups
  })

  const solvesByTeam = $derived(
    new Map(entries.map(e => [e.id, new Map(e.solves.map(s => [s.id, s]))]))
  )
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
      <BoomerHeader {categoryGroups} teamColWidth={TEAM_COL_WIDTH} />

      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="flex flex-col gap-1"
        onmouseleave={() => (hoveredTeamId = null)}
      >
        {#each entries as entry, index (entry.id)}
          {@const rank = (page - 1) * PAGE_SIZE + index + 1}
          {@const solves = solvesByTeam.get(entry.id)!}
          <BoomerRow
            {entry}
            {rank}
            {categoryGroups}
            {solves}
            isCurrentUser={$userQuery.data?.id === entry.id}
            teamColWidth={TEAM_COL_WIDTH}
            onHover={() => (hoveredTeamId = entry.id)}
          />
        {/each}
      </div>
    </ScrollArea>
  </div>
</div>

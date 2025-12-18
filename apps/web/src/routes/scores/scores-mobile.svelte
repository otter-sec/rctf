<script lang="ts">
  import type { LeaderboardEntry, LeaderboardGraphEntry, UserProfile } from '@rctf/types'
  import { Avatar, EmptyState, ScrollArea } from '$lib/components'
  import { IconMoodWrrrFilled } from '$lib/icons'
  import { cn, countryCodeToFlagFilename, getInitials } from '$lib/utils'
  import { getRankStylesForPosition } from '$lib/utils/rank'
  import { PAGE_SIZE } from './constants'
  import DeltaIndicator from './delta-indicator.svelte'
  import Pagination from './pagination.svelte'
  import ScoresGraph from './scores-graph.svelte'
  import type { TeamRowData } from './types'

  interface Props {
    entries: LeaderboardEntry[]
    graphData: LeaderboardGraphEntry[]
    currentUser: UserProfile | null | undefined
    page: number
    totalPages: number
    showSelfRow: boolean
    rankDeltaByTeam: Map<string, number>
    isFetching: boolean
    isLoading: boolean
    hoveredTeamId: string | null
    solveHighlight: { teamId: string; time: number } | null
    showTop3Context: boolean
    showDivision?: boolean
    onPageChange: (page: number) => void
  }

  let {
    entries,
    graphData,
    currentUser,
    page,
    totalPages,
    showSelfRow,
    rankDeltaByTeam,
    isFetching,
    isLoading,
    hoveredTeamId,
    solveHighlight,
    showTop3Context,
    showDivision = true,
    onPageChange,
  }: Props = $props()
</script>

{#snippet mobileTeamRow(data: TeamRowData)}
  {@const styles = getRankStylesForPosition(data.rank, data.isCurrentUser)}
  {@const flagFilename = data.countryCode ? countryCodeToFlagFilename(data.countryCode) : null}
  <div
    class={cn(
      'relative flex h-16 items-center gap-2 rounded-lg px-4',
      'before:bg-background-l2 before:absolute before:inset-0 before:-z-10 before:rounded-lg',
      styles.gradient && [
        'after:absolute after:inset-y-0 after:left-0 after:-z-10 after:w-96 after:max-w-full after:rounded-lg after:bg-linear-to-r after:to-transparent',
        styles.gradient,
      ]
    )}
  >
    <div class="flex shrink-0 items-center">
      <div class="flex w-10 flex-col items-center">
        <span class={cn('text-lg tabular-nums', styles.fgL0)}>#{data.rank}</span>
        {#if showDivision && data.divisionPlace}
          <span class={cn('text-sm tabular-nums', styles.fgL1)}>#{data.divisionPlace}</span>
        {:else if data.delta}
          <DeltaIndicator delta={data.delta} />
        {/if}
      </div>
    </div>

    <Avatar.Root class="size-10 shrink-0 rounded-lg">
      {#if data.avatarUrl}
        <Avatar.Image src={data.avatarUrl} alt={data.name} class="rounded-lg" />
      {/if}
      <Avatar.Fallback class="rounded-lg text-sm">{getInitials(data.name)}</Avatar.Fallback>
    </Avatar.Root>

    <div class="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
      <div class="flex items-center gap-1.5">
        <a
          href="/profile/{data.id}"
          class={cn('truncate text-lg/tight hover:underline', styles.fgL0)}>{data.name}</a
        >
        {#if showDivision}
          <span class={cn('shrink-0 text-sm', styles.fgL1)}>({data.division})</span>
        {/if}
      </div>
      <div class="flex items-center gap-1">
        {#if flagFilename && data.countryCode}
          <img
            src="/flags/{flagFilename}"
            alt="{data.countryCode} flag"
            class="h-5 w-auto shrink-0"
          />
        {/if}
        {#if flagFilename && data.countryCode && data.statusText}
          <span class={cn('text-lg leading-none', styles.fgL1)}>·</span>
        {/if}
        {#if data.statusText}
          <span class={cn('truncate text-sm', styles.fgL1)}>{data.statusText}</span>
        {/if}
      </div>
    </div>

    <div class="flex shrink-0 flex-col items-end">
      <span class="text-foreground-l1 text-lg tabular-nums"
        >{data.score.toLocaleString()} <span class="text-foreground-l3">pts</span></span
      >
      <span class="text-foreground-l3 text-sm"
        >{data.solveCount} solve{data.solveCount !== 1 ? 's' : ''}</span
      >
    </div>
  </div>
{/snippet}

<div class="relative flex h-[calc(100vh-72px)] flex-col px-4 md:hidden">
  <div class="bg-background-l0 sticky top-0 z-30 pb-2">
    <div class="flex items-center justify-between py-2">
      <span class="text-foreground-l2 text-base">Scoreboard</span>
      <Pagination {page} {totalPages} {isFetching} {onPageChange} />
    </div>

    <div class="bg-background-l1 h-48 w-full rounded-lg">
      <ScoresGraph
        class="h-full w-full"
        {hoveredTeamId}
        offset={(page - 1) * PAGE_SIZE}
        {solveHighlight}
        {graphData}
        {showTop3Context}
      />
    </div>
  </div>

  <ScrollArea class="min-h-0 flex-1">
    <div class="flex flex-col gap-1">
      {#if isLoading}
        {#each Array(PAGE_SIZE) as _}
          <div class="bg-background-l1 flex h-14 items-center gap-2 rounded-lg px-4">
            <div class="flex w-10 flex-col items-center gap-1">
              <div class="bg-background-l3 h-5 w-8 rounded"></div>
              {#if showDivision}<div class="bg-background-l3 h-4 w-6 rounded"></div>{/if}
            </div>
            <div class="bg-background-l3 size-10 rounded-lg"></div>
            <div class="flex flex-1 flex-col gap-1">
              <div class="bg-background-l3 h-5 w-28 rounded"></div>
              {#if showDivision}<div class="bg-background-l3 h-4 w-20 rounded"></div>{/if}
            </div>
            <div class="flex flex-col items-end gap-1">
              <div class="bg-background-l3 h-5 w-16 rounded"></div>
              <div class="bg-background-l3 h-4 w-12 rounded"></div>
            </div>
          </div>
        {/each}
      {:else if entries.length === 0}
        <div class="bg-background-l1 rounded-lg">
          <EmptyState
            icon={IconMoodWrrrFilled}
            title="No solves yet"
            subtitle="The leaderboard will populate as teams solve challenges"
          />
        </div>
      {:else}
        {#each entries as entry, i (entry.id)}
          {@const rank = (page - 1) * PAGE_SIZE + i + 1}
          {@const isYou = currentUser?.id === entry.id}
          {@render mobileTeamRow({
            id: entry.id,
            name: entry.name,
            avatarUrl: entry.avatarUrl,
            division: entry.division,
            divisionPlace: entry.divisionPlace,
            countryCode: entry.countryCode,
            statusText: entry.statusText,
            score: entry.score,
            solveCount: entry.solves.length,
            rank,
            isCurrentUser: isYou,
            delta: rankDeltaByTeam.get(entry.id),
          })}
        {/each}
      {/if}
    </div>
  </ScrollArea>

  {#if showSelfRow && currentUser}
    <div class="bg-background-l0 sticky bottom-0 z-30 my-4">
      {@render mobileTeamRow({
        id: currentUser.id,
        name: currentUser.name,
        avatarUrl: currentUser.avatarUrl,
        division: currentUser.division,
        divisionPlace: currentUser.divisionPlace,
        countryCode: currentUser.countryCode,
        statusText: currentUser.statusText,
        score: currentUser.score,
        solveCount: currentUser.solves.length,
        rank: currentUser.globalPlace ?? 0,
        isCurrentUser: true,
        delta: rankDeltaByTeam.get(currentUser.id),
      })}
    </div>
  {/if}
</div>

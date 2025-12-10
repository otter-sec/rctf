<script lang="ts">
  import type { LeaderboardEntry, LeaderboardGraphEntry, UserProfile } from '@rctf/types'
  import { Avatar, ScrollArea } from '$lib/components'
  import {
    IconChevronLeft,
    IconChevronLeftPipe,
    IconChevronRight,
    IconChevronRightPipe,
    IconTriangleFilled,
    IconTriangleInvertedFilled,
  } from '$lib/icons'
  import { cn, getInitials } from '$lib/utils'
  import { getRankStylesForPosition } from '$lib/utils/rank'
  import { PAGE_SIZE } from './constants'
  import ScoresGraph from './scores-graph.svelte'

  // TODO(enscribe): don't randomize
  const COUNTRY_CODES = [
    'UP',
    'JP',
    'GB',
    'DE',
    'FR',
    'KR',
    'CN',
    'CA',
    'AU',
    'BR',
    'IN',
    'IL',
    'ES',
    'NL',
    'SE',
    'NO',
    'FI',
    'PL',
    'RU',
    'UA',
    'TR',
    'MX',
    'AR',
    'CH',
    'AT',
    'BE',
    'DK',
    'PT',
    'CZ',
    'RO',
    'HU',
    'GR',
    'IT',
    'SG',
    'TW',
    'VN',
    'TH',
    'MY',
    'ID',
    'PH',
  ]

  function countryCodeToFlagFilename(code: string): string {
    const codePoints = code
      .toUpperCase()
      .split('')
      .map(char => (char.charCodeAt(0) + 127397).toString(16))
    return `${codePoints.join('-')}.svg`
  }

  function getRandomCountryCode(teamId: string): string | null {
    let hash = 0
    for (let i = 0; i < teamId.length; i++) {
      hash = (hash << 5) - hash + teamId.charCodeAt(i)
      hash |= 0
    }
    if (Math.abs(hash) % 5 === 0) return null
    return COUNTRY_CODES[Math.abs(hash) % COUNTRY_CODES.length] ?? null
  }

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

{#snippet deltaIndicator(delta: number | undefined)}
  {#if delta && delta > 0}
    <div class="text-foreground-success flex items-center gap-0.5 text-sm tabular-nums">
      <IconTriangleFilled class="size-2.5" />
      <span>{delta}</span>
    </div>
  {:else if delta && delta < 0}
    <div class="text-foreground-destructive flex items-center gap-0.5 text-sm tabular-nums">
      <IconTriangleInvertedFilled class="size-2.5" />
      <span>{Math.abs(delta)}</span>
    </div>
  {/if}
{/snippet}

{#snippet mobileTeamRow(
  id: string,
  name: string,
  avatarUrl: string | null | undefined,
  division: string,
  divisionPlace: number | null,
  score: number,
  solveCount: number,
  rank: number,
  isCurrentUser: boolean,
  delta: number | undefined = undefined
)}
  {@const styles = getRankStylesForPosition(rank, isCurrentUser)}
  {@const countryCode = getRandomCountryCode(id)}
  {@const flagFilename = countryCode ? countryCodeToFlagFilename(countryCode) : null}
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
        <span class={cn('text-lg tabular-nums', styles.fgL0)}>#{rank}</span>
        {#if showDivision && divisionPlace}
          <span class={cn('text-sm tabular-nums', styles.fgL1)}>#{divisionPlace}</span>
        {:else if delta}
          {@render deltaIndicator(delta)}
        {/if}
      </div>
    </div>

    <Avatar.Root class="size-10 shrink-0 rounded-lg">
      {#if avatarUrl}
        <Avatar.Image src={avatarUrl} alt={name} class="rounded-lg" />
      {/if}
      <Avatar.Fallback class="rounded-lg text-sm">{getInitials(name)}</Avatar.Fallback>
    </Avatar.Root>

    <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
      <a
        href="/profile/{id}"
        class={cn('block truncate text-lg/tight leading-[100%] hover:underline', styles.fgL0)}
        >{name}</a
      >
      <div class="flex items-center gap-1.5">
        {#if flagFilename && countryCode}
          <img src="/flags/{flagFilename}" alt="{countryCode} flag" class="h-5 w-auto shrink-0" />
        {/if}
        {#if showDivision}
          <span class={cn('truncate text-sm', styles.fgL1)}>{division}</span>
        {/if}
      </div>
    </div>

    <div class="flex shrink-0 flex-col items-end">
      <span class="text-foreground-l1 text-lg tabular-nums"
        >{score.toLocaleString()} <span class="text-foreground-l3">pts</span></span
      >
      <span class="text-foreground-l3 text-sm">{solveCount} solve{solveCount !== 1 ? 's' : ''}</span
      >
    </div>
  </div>
{/snippet}

<div class="relative flex h-[calc(100vh-72px)] flex-col px-4 md:hidden">
  <div class="bg-background-l0 sticky top-0 z-30 pb-2">
    <div class="flex items-center justify-between py-2">
      <span class="text-foreground-l2 text-base">Scoreboard</span>
      <div class="flex items-center gap-0.5">
        <button
          class="bg-background-l3 text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l4 flex h-9 w-10 items-center justify-center rounded-md disabled:pointer-events-none disabled:opacity-50"
          onclick={() => onPageChange(1)}
          disabled={page === 1 || isFetching}
        >
          <IconChevronLeftPipe class="size-4" />
        </button>
        <button
          class="bg-background-l3 text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l4 flex h-9 w-10 items-center justify-center rounded-md disabled:pointer-events-none disabled:opacity-50"
          onclick={() => onPageChange(page - 1)}
          disabled={page === 1 || isFetching}
        >
          <IconChevronLeft class="size-4" />
        </button>
        <span
          class={cn('text-foreground-l3 min-w-16 text-center text-sm', isFetching && 'opacity-50')}
        >
          Page {page}
        </span>
        <button
          class="bg-background-l3 text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l4 flex h-9 w-10 items-center justify-center rounded-md disabled:pointer-events-none disabled:opacity-50"
          onclick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isFetching}
        >
          <IconChevronRight class="size-4" />
        </button>
        <button
          class="bg-background-l3 text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l4 flex h-9 w-10 items-center justify-center rounded-md disabled:pointer-events-none disabled:opacity-50"
          onclick={() => onPageChange(totalPages)}
          disabled={page >= totalPages || isFetching}
        >
          <IconChevronRightPipe class="size-4" />
        </button>
      </div>
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
              {#if showDivision}
                <div class="bg-background-l3 h-4 w-6 rounded"></div>
              {/if}
            </div>
            <div class="bg-background-l3 size-10 rounded-lg"></div>
            <div class="flex flex-1 flex-col gap-1">
              <div class="bg-background-l3 h-5 w-28 rounded"></div>
              {#if showDivision}
                <div class="bg-background-l3 h-4 w-20 rounded"></div>
              {/if}
            </div>
            <div class="flex flex-col items-end gap-1">
              <div class="bg-background-l3 h-5 w-16 rounded"></div>
              <div class="bg-background-l3 h-4 w-12 rounded"></div>
            </div>
          </div>
        {/each}
      {:else}
        {#each entries as entry, i (entry.id)}
          {@const rank = (page - 1) * PAGE_SIZE + i + 1}
          {@const isYou = currentUser?.id === entry.id}
          {@render mobileTeamRow(
            entry.id,
            entry.name,
            entry.avatarUrl,
            entry.division,
            entry.divisionPlace,
            entry.score,
            entry.solves.length,
            rank,
            isYou,
            rankDeltaByTeam.get(entry.id)
          )}
        {/each}
      {/if}
    </div>
  </ScrollArea>

  {#if showSelfRow && currentUser}
    <div class="bg-background-l0 sticky bottom-0 z-30 my-4">
      {@render mobileTeamRow(
        currentUser.id,
        currentUser.name,
        currentUser.avatarUrl,
        currentUser.division,
        currentUser.divisionPlace,
        currentUser.score,
        currentUser.solves.length,
        currentUser.globalPlace ?? 0,
        true,
        rankDeltaByTeam.get(currentUser.id)
      )}
    </div>
  {/if}
</div>

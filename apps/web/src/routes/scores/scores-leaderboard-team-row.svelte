<script lang="ts">
  import { cn, countryCodeToFlagFilename, getInitials, getRankStylesForPosition } from '$lib/utils'
  import type { ScoresTeamRowData } from './scores-leaderboard-team-row-data'
  import ScoresDeltaIndicator from './scores-leaderboard-team-row-delta-indicator.svelte'
  import ScoresSolveCells from './scores-leaderboard-team-row-solve-cells.svelte'
  import ScoresSparkline from './scores-leaderboard-team-row-sparkline.svelte'
  import type {
    CategoryGroup,
    ChallengeInfo,
    SortMode,
    TooltipData,
    ViewMode,
  } from './scores-shared-types'

  interface Props {
    data: ScoresTeamRowData | null
    solves: Set<string> | null
    solveTimes: Map<string, number> | null
    themeEpoch: number
    renderEpoch: number
    isSelf?: boolean
    isLoading?: boolean
    isScrolling?: boolean
    isDesktop?: boolean
    contentWidth: number
    viewMode: ViewMode
    sortMode: SortMode
    categoryGroups: CategoryGroup[]
    challenges: ChallengeInfo[]
    focusedChallengeId: string | null
    getCategoryStats: (group: CategoryGroup) => { solved: number; total: number; percent: number }
    getBloodIndex: (challengeId: string) => number
    onCellHover: (data: TooltipData | null, x: number, y: number) => void
    onSparklineHover: () => void
    onSparklineUnhover: () => void
  }

  let {
    data,
    solves,
    solveTimes,
    themeEpoch,
    renderEpoch,
    isSelf = false,
    isLoading = false,
    isScrolling = false,
    isDesktop = true,
    contentWidth,
    viewMode,
    sortMode,
    categoryGroups,
    challenges,
    focusedChallengeId,
    getCategoryStats,
    getBloodIndex,
    onCellHover,
    onSparklineHover,
    onSparklineUnhover,
  }: Props = $props()

  const styles = $derived(
    data ? getRankStylesForPosition(data.globalRank ?? data.rank ?? 0, data.isCurrentUser) : null
  )
  const flagFilename = $derived(
    data?.countryCode ? countryCodeToFlagFilename(data.countryCode) : null
  )
  const initials = $derived(data ? getInitials(data.name) : '')

  let imgFailed = $state(false)
</script>

<div
  class={cn(
    'score-row-team-cell bg-background-l0 sticky left-0 h-(--row-height)',
    'w-(--team-column-width) shrink-0',
    isSelf ? 'z-30' : 'z-10'
  )}
>
  <div
    aria-hidden="true"
    class={[
      'score-row-team-focus-ring pointer-events-none absolute inset-0 z-30 rounded-lg',
      'border-[3px] border-solid border-transparent opacity-0',
      'md:rounded-r-none md:border-r-0',
    ]}
  ></div>

  <div
    class={cn(
      'before:bg-background-l2 relative flex h-full w-full items-center gap-2 rounded-lg px-4',
      'before:absolute before:inset-0 before:-z-10 before:rounded-lg',
      'md:rounded-r-none md:before:rounded-r-none',
      styles?.gradient && [
        'after:absolute after:inset-y-0 after:left-0 after:-z-10 after:w-96',
        'after:max-w-full after:rounded-lg after:bg-linear-to-r after:to-transparent',
        'md:after:rounded-r-none',
        styles.gradient,
      ],
      data?.isCurrentUser && 'before:bg-background-self-l0'
    )}
  >
    {#if data}
      <div class="flex shrink-0 items-center">
        <div class="hidden w-6 xl:block">
          <ScoresDeltaIndicator delta={data.delta} />
        </div>
        <div class="flex w-8 flex-col items-center leading-none sm:w-10 lg:w-16">
          <span class={cn('text-base tabular-nums sm:text-xl', styles?.fgL0)}
            >#{data.rank ?? '?'}</span
          >
          {#if data.divisionPlace}
            <span
              class="text-foreground-l3 text-xs leading-none tabular-nums"
              title={data.divisionName ?? undefined}>#{data.divisionPlace}</span
            >
          {/if}
        </div>
      </div>

      <div
        class={[
          'relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg',
          'sm:size-12',
        ]}
        data-slot="avatar"
      >
        {#if data.avatarUrl && !imgFailed}
          <img
            src={data.avatarUrl}
            alt={data.name}
            class="aspect-square size-full rounded-lg object-cover"
            onerror={() => (imgFailed = true)}
          />
        {:else}
          <!-- we need something more lightweight than bits-ui's avatar -->
          <span
            class={[
              'bg-background-l4 text-foreground-l3 flex size-full items-center justify-center',
              'rounded-lg text-sm',
            ]}>{initials}</span
          >
        {/if}
      </div>

      <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div class="flex items-center gap-1.5">
          <a
            href="/profile/{data.id}"
            class={cn(
              'score-row-profile-link truncate text-lg outline-none hover:underline sm:text-xl',
              styles?.fgL0
            )}
          >
            {data.name}
          </a>
        </div>
        <div class="flex min-w-0 items-center gap-1">
          {#if flagFilename && data.countryCode}
            <img
              src="/flags/{flagFilename}"
              alt="{data.countryCode} flag"
              title={data.countryCode}
              class="size-5 min-w-5 shrink-0"
            />
          {/if}
          {#if flagFilename && data.countryCode && data.statusText}
            <span class={cn('shrink-0 text-xl leading-none', styles?.fgL1)}>·</span>
          {/if}
          {#if data.statusText}
            <span class={cn('truncate text-sm sm:text-base', styles?.fgL1)}>{data.statusText}</span>
          {/if}
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-2 sm:gap-4">
        <div class="flex flex-col items-end">
          <span class="text-foreground-l1 text-lg whitespace-nowrap tabular-nums sm:text-xl">
            {data.score.toLocaleString()} <span class="text-foreground-l3">pts</span>
          </span>
          <span class="text-foreground-l3 text-sm whitespace-nowrap sm:text-base">
            {data.solveCount} solve{data.solveCount !== 1 ? 's' : ''}
          </span>
        </div>

        {#if isDesktop}
          <div
            class={[
              'pointer-events-none absolute hidden h-10 w-24 opacity-0 md:block',
              'xl:pointer-events-auto xl:relative xl:opacity-100',
            ]}
          >
            <ScoresSparkline
              data={data.sparklineData ?? []}
              id={data.id}
              color={data.color ?? 'var(--foreground-l3)'}
              onHover={onSparklineHover}
              onUnhover={onSparklineUnhover}
            />
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

{#if isDesktop}
  <div
    class={cn(
      'score-row-content-cell bg-background-l2 relative hidden h-(--row-height) shrink-0',
      'rounded-r-lg contain-[layout_style_paint] md:flex',
      !isSelf && isScrolling && 'pointer-events-none',
      isLoading && 'w-(--content-column-width) px-2',
      data?.isCurrentUser && 'bg-background-self-l0'
    )}
    style:width={isLoading ? undefined : `${contentWidth}px`}
  >
    <div
      aria-hidden="true"
      class={[
        'score-row-content-focus-ring pointer-events-none absolute inset-0 z-30 rounded-r-lg',
        'border-[3px] border-l-0 border-solid border-transparent opacity-0',
      ]}
    ></div>

    {#if !isLoading && data}
      <ScoresSolveCells
        teamId={data.id}
        {viewMode}
        {sortMode}
        {categoryGroups}
        {challenges}
        {focusedChallengeId}
        {themeEpoch}
        {renderEpoch}
        getSolves={cid => solves?.has(cid) ?? false}
        getSolveTime={cid => solveTimes?.get(cid)}
        {getCategoryStats}
        {getBloodIndex}
        {onCellHover}
        {isScrolling}
        isCurrentUser={data.isCurrentUser}
      />
    {/if}
  </div>
{/if}

<style>
  .score-row-team-cell:has(.score-row-profile-link:focus-visible) > .score-row-team-focus-ring,
  .score-row-team-cell:has(.score-row-profile-link:focus-visible)
    + .score-row-content-cell
    > .score-row-content-focus-ring {
    border-color: color-mix(in oklab, var(--ring) 50%, transparent);
    opacity: 1;
  }
</style>

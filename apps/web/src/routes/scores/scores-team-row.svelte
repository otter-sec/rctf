<script lang="ts">
  import { countryCodeToFlagFilename, getInitials, getRankVariant } from '$lib/utils'
  import ScoresDeltaIndicator from './scores-delta-indicator.svelte'
  import ScoresSolveCells from './scores-solve-cells.svelte'
  import ScoresSparkline from './scores-sparkline.svelte'
  import type { ScoresTeamRowData } from './scores-team-row-data'
  import type { CategoryGroup, ChallengeInfo, SortMode, TooltipData, ViewMode } from './types'

  interface Props {
    data: ScoresTeamRowData | null
    solves: Set<string> | null
    solveTimes: Map<string, number> | null
    challengePoints: Map<string, number> | null
    challengePointDeltas: Map<string, number> | null
    themeEpoch: number
    renderEpoch: number
    isSelf?: boolean
    isLoading?: boolean
    isScrolling?: boolean
    isDesktop?: boolean
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
    challengePoints,
    challengePointDeltas,
    themeEpoch,
    renderEpoch,
    isSelf = false,
    isLoading = false,
    isScrolling = false,
    isDesktop = true,
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

  const rankVariant = $derived(
    data ? getRankVariant(data.globalRank ?? data.rank ?? 0, data.isCurrentUser) : 'nth'
  )
  const flagFilename = $derived(
    data?.countryCode ? countryCodeToFlagFilename(data.countryCode) : null
  )
  const initials = $derived(data ? getInitials(data.name) : '')

  let imgFailed = $state(false)
  let lastAvatarUrl: string | null | undefined = undefined
  $effect(() => {
    // virtual rows are keyed by index, so the same component instance is reused
    // for different entries; reset img fallback when the avatar url changes
    if (data?.avatarUrl !== lastAvatarUrl) {
      lastAvatarUrl = data?.avatarUrl
      imgFailed = false
    }
  })
</script>

<score-team-cell
  self={isSelf || undefined}
  rank={rankVariant}
  current={data?.isCurrentUser || undefined}
>
  <focus-ring aria-hidden="true"></focus-ring>

  <team-surface ranked={(data !== null && rankVariant !== 'nth') || undefined}>
    {#if data}
      <rank-cluster>
        <delta-slot>
          <ScoresDeltaIndicator delta={data.delta} />
        </delta-slot>
        <team-rank>
          <span>#{data.rank ?? '?'}</span>
          {#if data.divisionPlace}
            <small title={data.divisionName ?? undefined}>
              #{data.divisionPlace}
            </small>
          {/if}
        </team-rank>
      </rank-cluster>

      <team-avatar>
        {#if data.avatarUrl && !imgFailed}
          <img
            src={data.avatarUrl}
            alt={data.name}
            data-avatar-image
            decoding="async"
            draggable="false"
            onerror={() => (imgFailed = true)}
          />
        {:else}
          <span>{initials}</span>
        {/if}
      </team-avatar>

      <team-text>
        <team-name>
          <a href="/profile/{data.id}">{data.name}</a>
        </team-name>
        <team-meta>
          {#if flagFilename && data.countryCode}
            <img
              src="/flags/{flagFilename}"
              alt="{data.countryCode} flag"
              title={data.countryCode}
              data-flag
              decoding="async"
              draggable="false"
            />
          {/if}
          {#if flagFilename && data.countryCode && data.statusText}
            <span>&middot;</span>
          {/if}
          {#if data.statusText}
            <status-text>{data.statusText}</status-text>
          {/if}
        </team-meta>
      </team-text>

      <score-total>
        <score-points>
          <strong>
            {data.score.toLocaleString()} <span>pts</span>
          </strong>
          <small>
            {data.solveCount} solve{data.solveCount !== 1 ? 's' : ''}
          </small>
        </score-points>

        {#if isDesktop}
          <spark-line>
            <ScoresSparkline
              data={data.sparklineData ?? []}
              id={data.id}
              color={data.color ?? 'var(--foreground-l3)'}
              onHover={onSparklineHover}
              onUnhover={onSparklineUnhover}
            />
          </spark-line>
        {/if}
      </score-total>
    {/if}
  </team-surface>
</score-team-cell>

{#if isDesktop}
  <score-content-cell
    scrolling={(!isSelf && isScrolling) || undefined}
    loading={isLoading || undefined}
    current={data?.isCurrentUser || undefined}
  >
    <focus-ring aria-hidden="true"></focus-ring>

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
        getChallengePoints={cid => challengePoints?.get(cid)}
        getChallengePointDelta={cid => challengePointDeltas?.get(cid)}
        {getCategoryStats}
        {getBloodIndex}
        {onCellHover}
        {isScrolling}
        isCurrentUser={data.isCurrentUser}
      />
    {/if}
  </score-content-cell>
{/if}

<style>
  score-team-cell {
    --rank-fg-l0: var(--foreground-nth-l0);
    --rank-fg-l1: var(--foreground-nth-l1);
    --rank-glow: transparent;
    display: block;
    position: sticky;
    inset-inline-start: 0;
    z-index: 10;
    flex-shrink: 0;
    width: var(--score-team-column-width);
    height: var(--score-row-height);
    background: var(--background-l0);

    &[self] {
      z-index: 30;
    }

    &[rank='first'] {
      --rank-fg-l0: var(--foreground-gold-l0);
      --rank-fg-l1: var(--foreground-gold-l1);
      --rank-glow: color-mix(in oklab, var(--foreground-gold-l0) 15%, transparent);
    }

    &[rank='second'] {
      --rank-fg-l0: var(--foreground-silver-l0);
      --rank-fg-l1: var(--foreground-silver-l1);
      --rank-glow: color-mix(in oklab, var(--foreground-silver-l0) 15%, transparent);
    }

    &[rank='third'] {
      --rank-fg-l0: var(--foreground-bronze-l0);
      --rank-fg-l1: var(--foreground-bronze-l1);
      --rank-glow: color-mix(in oklab, var(--foreground-bronze-l0) 15%, transparent);
    }

    &[rank='self'] {
      --rank-fg-l0: var(--foreground-self-l0);
      --rank-fg-l1: var(--foreground-self-l1);
      --rank-glow: color-mix(in oklab, var(--foreground-self-l0) 15%, transparent);
    }

    &[current] team-surface::before {
      background: var(--background-self-l0);
    }

    &:has(a:focus-visible) > focus-ring {
      border-color: color-mix(in oklab, var(--ring) 50%, transparent);
      opacity: 1;
    }

    &:has(a:focus-visible) + score-content-cell > focus-ring {
      border-color: color-mix(in oklab, var(--ring) 50%, transparent);
      opacity: 1;
    }

    team-surface {
      position: relative;
      height: 100%;
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      box-sizing: border-box;
      padding-inline: calc(var(--spacing) * 4);
      border-radius: var(--radius-lg);
      color: var(--rank-fg-l1);

      &::before,
      &::after {
        content: '';
        position: absolute;
        inset: 0;
        z-index: -1;
        border-radius: inherit;
      }

      &::before {
        background: var(--background-l2);
      }

      &[ranked]::after {
        width: min(24rem, 100%);
        background: linear-gradient(to right, var(--rank-glow), transparent);
      }
    }

    rank-cluster,
    team-meta,
    score-total {
      display: flex;
      align-items: center;
    }

    rank-cluster,
    score-total {
      flex-shrink: 0;
    }

    delta-slot {
      display: none;
      width: calc(var(--spacing) * 6);
    }

    team-rank {
      width: calc(var(--spacing) * 8);
      display: flex;
      flex-direction: column;
      align-items: center;
      line-height: 1;

      span {
        color: var(--rank-fg-l0);
        font-size: var(--text-base);
        font-variant-numeric: tabular-nums;
      }

      small {
        color: var(--foreground-l3);
        font-size: var(--text-xs);
        line-height: 1;
        font-variant-numeric: tabular-nums;
      }
    }

    team-avatar {
      position: relative;
      width: calc(var(--spacing) * 10);
      height: calc(var(--spacing) * 10);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: var(--radius-lg);

      img[data-avatar-image] {
        width: 100%;
        height: 100%;
        aspect-ratio: 1;
        object-fit: cover;
        border-radius: inherit;
      }

      span {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: inherit;
        background: var(--background-l4);
        color: var(--foreground-l3);
        font-size: var(--text-sm);
      }
    }

    team-text {
      min-width: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    team-name {
      display: flex;
      align-items: center;
      gap: calc(var(--spacing) * 1.5);

      a {
        overflow: hidden;
        color: var(--rank-fg-l0);
        font-size: var(--text-lg);
        text-overflow: ellipsis;
        white-space: nowrap;
        outline: none;

        &:hover {
          text-decoration: underline;
        }
      }
    }

    team-meta {
      min-width: 0;
      gap: calc(var(--spacing) * 1);

      img[data-flag] {
        width: calc(var(--spacing) * 5);
        min-width: calc(var(--spacing) * 5);
        height: calc(var(--spacing) * 5);
        flex-shrink: 0;
      }

      > span {
        flex-shrink: 0;
        color: var(--rank-fg-l1);
        font-size: var(--text-xl);
        line-height: 1;
      }

      status-text {
        display: block;
        overflow: hidden;
        color: var(--rank-fg-l1);
        font-size: var(--text-sm);
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    score-total {
      gap: calc(var(--spacing) * 2);
    }

    score-points {
      display: flex;
      flex-direction: column;
      align-items: flex-end;

      strong {
        color: var(--foreground-l1);
        font-size: var(--text-lg);
        font-weight: 400;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }

      span,
      small {
        color: var(--foreground-l3);
      }

      small {
        font-size: var(--text-sm);
        white-space: nowrap;
      }
    }

    spark-line {
      display: block;
      pointer-events: none;
      position: absolute;
      width: calc(var(--spacing) * 24);
      height: calc(var(--spacing) * 10);
      opacity: 0;
    }

    @media (width >= 40rem) {
      team-rank {
        width: calc(var(--spacing) * 10);
      }

      team-rank span,
      team-name a,
      score-points strong {
        font-size: var(--text-xl);
      }

      team-avatar {
        width: calc(var(--spacing) * 12);
        height: calc(var(--spacing) * 12);
      }

      status-text,
      score-points small {
        font-size: var(--text-base);
      }

      score-total {
        gap: calc(var(--spacing) * 4);
      }
    }

    @media (width >= 48rem) {
      > focus-ring {
        border-inline-end: 0;
        border-start-start-radius: var(--radius-lg);
        border-end-start-radius: var(--radius-lg);
        border-start-end-radius: 0;
        border-end-end-radius: 0;
      }

      team-surface,
      team-surface::before,
      team-surface::after {
        border-start-end-radius: 0;
        border-end-end-radius: 0;
      }
    }

    @media (width >= 64rem) {
      team-rank {
        width: calc(var(--spacing) * 16);
      }
    }

    @media (width >= 80rem) {
      delta-slot {
        display: block;
      }

      spark-line {
        pointer-events: auto;
        position: relative;
        opacity: 1;
      }
    }
  }

  score-content-cell {
    position: relative;
    display: none;
    flex-shrink: 0;
    height: var(--score-row-height);
    width: var(--score-content-width);
    background: var(--background-l2);
    border-start-end-radius: var(--radius-lg);
    border-end-end-radius: var(--radius-lg);
    contain: layout style paint;

    &[current] {
      background: var(--background-self-l0);
    }

    &[scrolling] {
      pointer-events: none;
    }

    &[loading] {
      width: var(--score-content-column-width);
      box-sizing: border-box;
      padding-inline: calc(var(--spacing) * 2);
    }

    > focus-ring {
      border-inline-start: 0;
      border-start-end-radius: var(--radius-lg);
      border-end-end-radius: var(--radius-lg);
    }

    @media (width >= 48rem) {
      display: flex;
    }
  }

  focus-ring {
    pointer-events: none;
    position: absolute;
    inset: 0;
    z-index: 30;
    opacity: 0;
    border: 3px solid transparent;
    border-radius: var(--radius-lg);
  }
</style>

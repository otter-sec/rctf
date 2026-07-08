<script lang="ts">
  import { ChallengeScoringKind, type Challenge } from '@rctf/types'
  import Chip from '$lib/ui/chip.svelte'
  import { getCategoryConfig } from '$lib/utils/categories'
  import ChallengePointDelta from '../model/point-delta.svelte'

  interface Props {
    challenge: Challenge
    isSolved: boolean
  }

  let { challenge }: Props = $props()

  const config = $derived(getCategoryConfig(challenge.category))
  const tags = $derived(challenge.tags ?? [])
  const isDynamic = $derived(challenge.scoringKind === ChallengeScoringKind.DYNAMIC)
  const showsScore = $derived(challenge.hasFlag || isDynamic)
  const displayPoints = $derived(isDynamic ? (challenge.yourScore ?? 0) : challenge.points)
</script>

<details-header>
  <header-main>
    <h2>{challenge.name}</h2>
    <header-meta>
      <span data-slot="author">by {challenge.author}</span>
      <meta-separator aria-hidden="true">·</meta-separator>
      <chip-row>
        <category-chip data-category-color={config.color}>
          <config.icon data-slot="category-icon" />
          {config.name}
        </category-chip>
        {#each tags as tag (tag)}
          <Chip>{tag}</Chip>
        {/each}
      </chip-row>
    </header-meta>
  </header-main>

  {#if showsScore}
    <header-score>
      <span data-slot="points">{displayPoints.toLocaleString()} pts</span>
      {#if isDynamic}
        <ChallengePointDelta delta={challenge.yourPointDelta ?? 0} />
      {:else}
        <span data-slot="solves">{challenge.solves.toLocaleString()} solves</span>
      {/if}
    </header-score>
  {/if}
</details-header>

<style>
  details-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 2.25rem;

    @media (width >= 40rem) {
      padding-block: 1.5rem;
    }
  }

  header-main {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 0.25rem;
    min-inline-size: 0;
  }

  h2 {
    margin: 0;
    overflow: hidden;
    font-size: 1.25rem;
    text-overflow: ellipsis;
    white-space: nowrap;

    @media (width >= 40rem) {
      font-size: 1.5rem;
    }
  }

  header-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem 0.5rem;
    color: var(--foreground-l3);
    font-size: 0.875rem;

    @media (width >= 40rem) {
      font-size: 1rem;
    }
  }

  meta-separator {
    display: none;
    font-size: 1.5rem;
    line-height: 1;
    color: var(--foreground-l5);
    opacity: 0.5;

    @media (width >= 40rem) {
      display: inline;
    }
  }

  [data-slot='author'] {
    flex-shrink: 0;
  }

  chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3xs);
  }

  category-chip {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.25rem;
    padding: 0.125rem 0.5rem;
    font-size: 0.75rem;
    color: var(--category-foreground-l1);
    white-space: nowrap;
    background: var(--category-background-l0);
    border-radius: var(--radius-lg);

    @media (width >= 40rem) {
      padding-inline: 0.75rem;
      font-size: 0.875rem;
    }

    :global([data-slot='category-icon']) {
      flex-shrink: 0;
      font-size: 0.75rem;

      @media (width >= 40rem) {
        font-size: 0.875rem;
      }
    }
  }

  header-score {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    flex-shrink: 0;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  [data-slot='points'] {
    font-size: 1.25rem;

    @media (width >= 40rem) {
      font-size: 1.5rem;
    }
  }

  [data-slot='solves'] {
    color: var(--foreground-l3);
    font-size: 0.875rem;

    @media (width >= 40rem) {
      font-size: 1rem;
    }
  }
</style>

<!--
  Detail header: name + author, the category chip (its own data-category-color
  remaps the generic --category-* tokens), any extra tags, and — for scored
  challenges — the points and solve count on the trailing edge.
-->
<script lang="ts">
  import { ChallengeScoringKind, type Challenge } from '@rctf/types'
  import Chip from '$lib/ui/chip.svelte'
  import { getCategoryConfig } from '$lib/utils/categories'

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
        <!-- U11: the dynamic point-delta chip replaces this line for dynamic challenges. -->
        <delta-slot></delta-slot>
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
    gap: var(--space-m);
    padding: var(--space-m) var(--space-l);
  }

  header-main {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-2xs);
    min-inline-size: 0;
  }

  h2 {
    margin: 0;
    overflow: hidden;
    font-size: var(--step-3);
    font-weight: var(--font-weight-medium);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  header-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2xs);
    color: var(--foreground-l3);
    font-size: var(--step--1);
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
    align-items: center;
    gap: var(--space-3xs);
    padding: 0.125rem var(--space-2xs);
    color: var(--category-foreground-l1);
    white-space: nowrap;
    background: var(--category-background-l0);
    border-radius: var(--radius-full);
  }

  category-chip :global([data-slot='category-icon']) {
    flex-shrink: 0;
    font-size: 0.875rem;
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
    font-size: var(--step-3);
    font-weight: var(--font-weight-medium);
  }

  [data-slot='solves'] {
    color: var(--foreground-l3);
    font-size: var(--step--1);
  }
</style>

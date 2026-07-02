<!--
  A single challenge row. Solve/blood/selected state is expressed purely through
  data-* attributes so CSS owns the edge gradients, indicator icon, and ring.
  Category colours are inherited from the enclosing group (its data-category-color
  remaps the generic --category-* tokens).
-->
<script lang="ts">
  import { ChallengeScoringKind, type Challenge } from '@rctf/types'
  import IconAwardFilled from '$lib/icons/icon-award-filled.svelte'
  import IconCheck from '$lib/icons/icon-check.svelte'

  type BloodTier = 'gold' | 'silver' | 'bronze'

  interface Props {
    challenge: Challenge
    category: string
    solved: boolean
    bloodTier: BloodTier | null
    selected: boolean
    onSelect: () => void
  }

  let { challenge, category, solved, bloodTier, selected, onSelect }: Props = $props()

  const isDynamic = $derived(challenge.scoringKind === ChallengeScoringKind.DYNAMIC)
  const showsScore = $derived(challenge.hasFlag || isDynamic)
  const displayPoints = $derived(isDynamic ? (challenge.yourScore ?? 0) : challenge.points)
  const solvesLabel = $derived(
    `${challenge.solves.toLocaleString()} ${challenge.solves === 1 ? 'solve' : 'solves'}`
  )
</script>

<li id="chall-{challenge.id}">
  <button
    type="button"
    onclick={onSelect}
    data-solved={solved && !bloodTier ? '' : undefined}
    data-blood={bloodTier ?? undefined}
    data-selected={selected ? '' : undefined}
  >
    {#if bloodTier}
      <IconAwardFilled data-indicator />
    {:else if solved}
      <IconCheck data-indicator />
    {/if}

    <item-main>
      <item-title>
        <span data-part="category">{category} /</span>
        <span data-part="name">{challenge.name}</span>
      </item-title>
      <span data-part="author">{challenge.author}</span>
    </item-main>

    {#if showsScore}
      <item-score>
        <span data-part="points">
          <strong>{displayPoints.toLocaleString()}</strong> pts
        </span>
        <!-- U11: the dynamic point-delta chip replaces this solve count for
             dynamic challenges; static challenges keep the count. -->
        <span data-part="solves">{solvesLabel}</span>
      </item-score>
    {/if}
  </button>
</li>

<style>
  li {
    display: block;
  }

  button {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    inline-size: 100%;
    padding: var(--space-2xs) var(--space-s);
    text-align: start;
    cursor: pointer;
    --edge-soft: color-mix(in srgb, var(--edge-color, transparent) 20%, transparent);

    &:hover {
      background: var(--category-background-l1-hover);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -2px;
      z-index: 1;
    }
  }

  button[data-solved] {
    --edge-color: var(--foreground-success);
  }

  button[data-blood='gold'] {
    --edge-color: var(--foreground-gold-l0);
  }

  button[data-blood='silver'] {
    --edge-color: var(--foreground-silver-l0);
  }

  button[data-blood='bronze'] {
    --edge-color: var(--foreground-bronze-l0);
  }

  button[data-solved]::before,
  button[data-blood]::before {
    content: '';
    position: absolute;
    inset-block: 0;
    inset-inline-start: 0;
    inline-size: 9rem;
    pointer-events: none;
    background: linear-gradient(to inline-end, var(--edge-soft), transparent);
  }

  button[data-selected] {
    box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--category-foreground-l1) 25%, transparent);
  }

  button[data-selected]::after {
    content: '';
    position: absolute;
    inset-block: 0;
    inset-inline-end: 0;
    inline-size: 24rem;
    pointer-events: none;
    background: linear-gradient(to inline-start, var(--category-background-l0), transparent);
  }

  button :global(svg[data-indicator]) {
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: var(--space-3xs);
    translate: 0 -50%;
    font-size: 1.25rem;
    color: var(--edge-color);
  }

  item-main {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
  }

  item-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--step-1);
  }

  [data-part='category'] {
    display: none;
    color: var(--category-foreground-l1);
  }

  [data-part='name'] {
    color: var(--category-foreground-l0);
  }

  [data-part='author'] {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--category-foreground-l1);
    opacity: 0.75;
  }

  item-score {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: row;
    gap: var(--space-2xs);
    align-items: baseline;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  [data-part='points'] {
    font-size: var(--step-1);
    color: var(--category-foreground-l1);
  }

  [data-part='points'] strong {
    color: var(--category-foreground-l0);
    font-weight: var(--font-weight-normal);
  }

  [data-part='solves'] {
    color: var(--category-foreground-l1);
    opacity: 0.75;
  }

  @container challenges-list (min-inline-size: 24rem) {
    button {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }

    [data-part='category'] {
      display: inline;
    }

    item-score {
      flex-direction: column;
      align-items: flex-end;
      gap: 0;
    }
  }
</style>

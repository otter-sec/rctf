<script lang="ts">
  import { ChallengeScoringKind, type AdminChallenge } from '@rctf/types'
  import IconChartAreaLineFilled from '$lib/icons/icon-chart-area-line-filled.svelte'
  import IconCloudComputingFilled from '$lib/icons/icon-cloud-computing-filled.svelte'
  import IconEyeClosed from '$lib/icons/icon-eye-closed.svelte'
  import IconRobot from '$lib/icons/icon-robot.svelte'
  import { pointsLabel } from './list-logic'

  interface Props {
    challenge: AdminChallenge
    category: string
    selected: boolean
    onSelect: () => void
  }

  let { challenge, category, selected, onSelect }: Props = $props()

  const isDynamic = $derived(challenge.scoring?.kind === ChallengeScoringKind.DYNAMIC)
  const hasStatusIcon = $derived(
    challenge.hidden || !!challenge.instancerConfig || !!challenge.adminBotConfig || isDynamic
  )
  const points = $derived(pointsLabel(challenge))
</script>

<li>
  <button type="button" onclick={onSelect} data-selected={selected ? '' : undefined}>
    <item-title>
      <span data-part="category">{category} /</span>
      <span data-part="name">{challenge.name}</span>
    </item-title>

    <item-meta>
      {#if hasStatusIcon}
        <item-status>
          {#if challenge.hidden}
            <IconEyeClosed data-status-icon />
          {/if}
          {#if isDynamic}
            <IconChartAreaLineFilled data-status-icon />
          {/if}
          {#if challenge.instancerConfig}
            <IconCloudComputingFilled data-status-icon />
          {/if}
          {#if challenge.adminBotConfig}
            <IconRobot data-status-icon />
          {/if}
        </item-status>
      {/if}
      {#if isDynamic}
        <span data-part="points"><strong>Dynamic</strong></span>
      {:else}
        <span data-part="points"><strong>{points}</strong> pts</span>
      {/if}
    </item-meta>
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
    gap: 0.25rem;
    inline-size: 100%;
    padding: 0.5rem 2.25rem;
    text-align: start;
    cursor: pointer;

    &:hover {
      background: var(--category-background-l1-hover);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -2px;
      z-index: 1;
    }

    &[data-selected] {
      box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--category-foreground-l1) 25%, transparent);

      &::after {
        content: '';
        position: absolute;
        inset-block: 0;
        inset-inline-end: 0;
        inline-size: 24rem;
        pointer-events: none;
        background: linear-gradient(to left, var(--category-background-l0), transparent);
      }
    }
  }

  item-title {
    position: relative;
    z-index: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--step-0);
  }

  [data-part='category'] {
    color: var(--category-foreground-l1);
  }

  [data-part='name'] {
    color: var(--category-foreground-l0);
  }

  item-meta {
    position: relative;
    z-index: 1;
    display: flex;
    gap: var(--space-s);
    align-items: center;
    justify-content: flex-end;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  item-status {
    display: flex;
    flex-shrink: 0;
    gap: 0.375rem;
    align-items: center;
    color: var(--category-foreground-l1);

    :global(svg[data-status-icon]) {
      flex-shrink: 0;
      font-size: 1rem;
    }
  }

  [data-part='points'] {
    color: var(--category-foreground-l1);

    strong {
      color: var(--category-foreground-l0);
      font-weight: var(--font-weight-normal);
    }
  }

  @container admin-challenges-list (min-inline-size: 24rem) {
    button {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-m);
    }

    item-title {
      min-inline-size: 0;
    }
  }
</style>

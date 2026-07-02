<!--
  Shared four-slot podium grid for the flag and dynamic variants. Each slot is a
  data-attribute-styled cell: `data-variant` (gold/silver/bronze/self/nth) drives
  the fill and text colour, `data-kind` switches empty/placeholder slots to a
  dashed muted treatment, and `data-min-cols` (from podiumMinColumns) sets the
  container width at which the slot survives the collapse. Container queries drop
  the grid from four columns to one, hiding the highest-ranked-last so the self
  slot and top solvers stay on screen the longest.
-->
<script lang="ts">
  import Avatar from '$lib/ui/avatar.svelte'
  import { podiumMinColumns, type PodiumSlot } from './podium-slots'

  interface Props {
    slots: PodiumSlot[]
  }

  let { slots }: Props = $props()

  const minColumns = $derived(podiumMinColumns(slots))
</script>

<podium-grid>
  <podium-track>
    {#each slots as slot, index (index)}
      <podium-slot
        data-kind={slot.kind}
        data-variant={slot.variant}
        data-min-cols={minColumns[index]}
      >
        {#if slot.ordinal}
          <slot-ordinal>{slot.ordinal}</slot-ordinal>
        {/if}
        {#if slot.kind !== 'empty'}
          <slot-body>
            <slot-text>
              <slot-name>{slot.name}</slot-name>
              <slot-detail>{slot.detail}</slot-detail>
            </slot-text>
            <Avatar src={slot.avatarUrl} name={slot.name} />
          </slot-body>
        {/if}
      </podium-slot>
    {/each}
  </podium-track>
</podium-grid>

<style>
  podium-grid {
    container-type: inline-size;
    display: block;
  }

  podium-track {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-2xs);
  }

  podium-slot {
    --slot-fg-l0: var(--foreground-nth-l0);
    --slot-fg-l1: var(--foreground-nth-l1);
    --slot-bg: var(--background-nth);
    --avatar-size: 2.75rem;

    display: flex;
    gap: var(--space-2xs);
    align-items: center;
    justify-content: space-between;
    block-size: 3.5rem;
    padding: var(--space-3xs);
    background: var(--slot-bg);
    border: 2px solid transparent;
    border-radius: var(--radius-lg);
  }

  podium-slot[data-variant='gold'] {
    --slot-fg-l0: var(--foreground-gold-l0);
    --slot-fg-l1: var(--foreground-gold-l1);
    --slot-bg: var(--background-gold);
  }

  podium-slot[data-variant='silver'] {
    --slot-fg-l0: var(--foreground-silver-l0);
    --slot-fg-l1: var(--foreground-silver-l1);
    --slot-bg: var(--background-silver);
  }

  podium-slot[data-variant='bronze'] {
    --slot-fg-l0: var(--foreground-bronze-l0);
    --slot-fg-l1: var(--foreground-bronze-l1);
    --slot-bg: var(--background-bronze);
  }

  podium-slot[data-variant='self'] {
    --slot-fg-l0: var(--foreground-self-l0);
    --slot-fg-l1: var(--foreground-self-l1);
    --slot-bg: var(--background-self-l1);
  }

  /* Empty and placeholder slots read as unfilled: dashed outline, no fill. */
  podium-slot[data-kind='empty'],
  podium-slot[data-kind='placeholder'] {
    background: transparent;
    border-style: dashed;
    border-color: var(--border);
  }

  podium-slot[data-kind='placeholder'] {
    --slot-fg-l0: var(--foreground-l4);
    --slot-fg-l1: color-mix(in oklab, var(--foreground-l5) 50%, transparent);
  }

  slot-ordinal {
    flex-shrink: 0;
    padding-inline-start: var(--space-3xs);
    font-size: var(--step-0);
    color: var(--slot-fg-l0);
    white-space: nowrap;
  }

  slot-body {
    display: flex;
    gap: var(--space-2xs);
    align-items: center;
    min-inline-size: 0;
  }

  slot-text {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    min-inline-size: 0;
  }

  slot-name {
    max-inline-size: 100%;
    overflow: hidden;
    font-size: var(--step-0);
    color: var(--slot-fg-l0);
    text-align: end;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  slot-detail {
    max-inline-size: 100%;
    overflow: hidden;
    font-size: var(--step--1);
    color: var(--slot-fg-l1);
    text-align: end;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Hidden by default; each breakpoint reveals the next tier of slots and widens
     the grid to match. Slots stay display:flex when shown. */
  podium-slot[data-min-cols='2'],
  podium-slot[data-min-cols='3'],
  podium-slot[data-min-cols='4'] {
    display: none;
  }

  @container (min-inline-size: 28rem) {
    podium-track {
      grid-template-columns: 1fr 1fr;
    }

    podium-slot[data-min-cols='2'] {
      display: flex;
    }
  }

  @container (min-inline-size: 42rem) {
    podium-track {
      grid-template-columns: 1fr 1fr 1fr;
    }

    podium-slot[data-min-cols='3'] {
      display: flex;
    }
  }

  @container (min-inline-size: 56rem) {
    podium-track {
      grid-template-columns: repeat(4, 1fr);
    }

    podium-slot[data-min-cols='4'] {
      display: flex;
    }
  }
</style>

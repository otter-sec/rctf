<script lang="ts">
  import Avatar from '$lib/ui/avatar.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { podiumMinColumns, type PodiumSlot } from './podium-slots'

  interface Props {
    slots: PodiumSlot[]
    loading?: boolean
    reveal?: boolean
  }

  let { slots, loading = false, reveal = false }: Props = $props()

  const minColumns = $derived(podiumMinColumns(slots))
</script>

<podium-grid>
  <podium-track>
    {#if loading}
      {#each { length: 4 }, index (index)}
        <podium-slot data-kind="loading" data-min-cols={index + 1}>
          <Spinner />
        </podium-slot>
      {/each}
    {:else}
      {#each slots as slot, index (index)}
        <podium-slot
          data-kind={slot.kind}
          data-variant={slot.variant}
          data-min-cols={minColumns[index]}
          data-reveal={reveal || undefined}
          style:--reveal-delay="{index * 50}ms"
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
    {/if}
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
    gap: 0.5rem;
  }

  podium-slot {
    --slot-fg-l0: var(--foreground-nth-l0);
    --slot-fg-l1: var(--foreground-nth-l1);
    --slot-bg: var(--background-nth);
    --avatar-size: 2.75rem;
    --avatar-radius: var(--radius-md);

    display: flex;
    gap: 0.5rem;
    align-items: center;
    justify-content: space-between;
    block-size: 3.5rem;
    padding: 0.25rem;
    background: var(--slot-bg);
    border: 2px solid transparent;
    border-radius: var(--radius-lg);

    &[data-variant='gold'] {
      --slot-fg-l0: var(--foreground-gold-l0);
      --slot-fg-l1: var(--foreground-gold-l1);
      --slot-bg: var(--background-gold);
    }

    &[data-variant='silver'] {
      --slot-fg-l0: var(--foreground-silver-l0);
      --slot-fg-l1: var(--foreground-silver-l1);
      --slot-bg: var(--background-silver);
    }

    &[data-variant='bronze'] {
      --slot-fg-l0: var(--foreground-bronze-l0);
      --slot-fg-l1: var(--foreground-bronze-l1);
      --slot-bg: var(--background-bronze);
    }

    &[data-variant='self'] {
      --slot-fg-l0: var(--foreground-self-l0);
      --slot-fg-l1: var(--foreground-self-l1);
      --slot-bg: var(--background-self-l1);
    }

    &[data-kind='empty'],
    &[data-kind='placeholder'],
    &[data-kind='loading'] {
      background: transparent;
      border-style: dashed;
      border-color: var(--border);
    }

    &[data-kind='placeholder'] {
      --slot-fg-l0: var(--foreground-l4);
      --slot-fg-l1: color-mix(in oklab, var(--foreground-l5) 50%, transparent);
    }

    &[data-kind='loading'] {
      justify-content: center;
      color: var(--foreground-l4);
    }

    &[data-reveal] {
      animation: reveal-fade-in 300ms ease backwards;
      animation-delay: var(--reveal-delay, 0ms);
    }

    @media (prefers-reduced-motion: reduce) {
      &[data-reveal] {
        animation: none;
      }
    }

    &[data-min-cols='2'],
    &[data-min-cols='3'],
    &[data-min-cols='4'] {
      display: none;
    }
  }

  slot-ordinal {
    flex-shrink: 0;
    padding-inline-start: 0.25rem;
    font-size: 1rem;
    color: var(--slot-fg-l0);
    white-space: nowrap;
  }

  slot-body {
    display: flex;
    gap: 0.5rem;
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
    font-size: 1rem;
    color: var(--slot-fg-l0);
    text-align: end;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  slot-detail {
    max-inline-size: 100%;
    overflow: hidden;
    font-size: 0.875rem;
    color: var(--slot-fg-l1);
    text-align: end;
    text-overflow: ellipsis;
    white-space: nowrap;
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

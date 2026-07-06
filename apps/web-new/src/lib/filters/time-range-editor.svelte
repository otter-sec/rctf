<script lang="ts">
  import Input from '$lib/ui/input.svelte'
  import {
    clearTimeRangeFilter,
    hasTimeRangeFilter,
    resolveTimeRangeFilter,
    type TimeRangeFilter,
    type TimeRangeMode,
  } from './time'

  // The caller owns `filter` as `$state`; this editor mutates it in place and
  // calls `onchange` after each edit so the host can recompute its query. The
  // error line reads live from `resolveTimeRangeFilter` — the same resolver the
  // query uses — so what the editor shows is exactly what the fetch would reject.
  type Props = {
    filter: TimeRangeFilter
    ctfStartTime: number | null
    onchange?: () => void
  }

  let { filter, ctfStartTime, onchange }: Props = $props()

  const error = $derived(resolveTimeRangeFilter(filter, ctfStartTime).error)
  const active = $derived(hasTimeRangeFilter(filter))

  const modes: { value: TimeRangeMode; label: string }[] = [
    { value: 'absolute', label: 'Absolute' },
    { value: 'relative', label: 'CTF-relative' },
  ]

  function setMode(mode: TimeRangeMode) {
    if (filter.mode === mode) return
    filter.mode = mode
    onchange?.()
  }

  function edit(apply: () => void) {
    apply()
    onchange?.()
  }

  function clear() {
    clearTimeRangeFilter(filter)
    onchange?.()
  }
</script>

<time-editor>
  <mode-toggle role="group" aria-label="Time mode">
    {#each modes as option (option.value)}
      <button
        type="button"
        data-active={filter.mode === option.value || undefined}
        aria-pressed={filter.mode === option.value}
        onclick={() => setMode(option.value)}
      >
        {option.label}
      </button>
    {/each}
  </mode-toggle>

  {#if filter.mode === 'relative'}
    <field-label>
      <span>From</span>
      <Input
        type="text"
        value={filter.relativeStart}
        placeholder="2d 4h"
        aria-invalid={!!error}
        oninput={event => edit(() => (filter.relativeStart = event.currentTarget.value))}
      />
    </field-label>
    <field-label>
      <span>To</span>
      <Input
        type="text"
        value={filter.relativeEnd}
        placeholder="2d 6h"
        aria-invalid={!!error}
        oninput={event => edit(() => (filter.relativeEnd = event.currentTarget.value))}
      />
    </field-label>
  {:else}
    <field-label>
      <span>From</span>
      <Input
        type="datetime-local"
        value={filter.start}
        aria-invalid={!!error}
        oninput={event => edit(() => (filter.start = event.currentTarget.value))}
      />
    </field-label>
    <field-label>
      <span>To</span>
      <Input
        type="datetime-local"
        value={filter.end}
        aria-invalid={!!error}
        oninput={event => edit(() => (filter.end = event.currentTarget.value))}
      />
    </field-label>
  {/if}

  {#if error}
    <field-error role="alert">{error}</field-error>
  {/if}

  {#if active}
    <button type="button" data-clear onclick={clear}>Clear time range</button>
  {/if}
</time-editor>

<style>
  time-editor {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    padding: var(--space-2xs);
  }

  mode-toggle {
    display: flex;
    gap: var(--space-3xs);
    padding: var(--space-3xs);
    background: var(--background-l2);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);

    button {
      flex: 1;
      block-size: 1.75rem;
      color: var(--foreground-l3);
      background: transparent;
      border: none;
      border-radius: var(--radius-sm);
      font-size: var(--step--1);
      cursor: pointer;

      &:hover {
        color: var(--foreground-l1);
      }

      &[data-active] {
        color: var(--foreground-l1);
        background: var(--background-l4);
      }

      &:focus-visible {
        outline: 2px solid var(--ring);
        outline-offset: -2px;
      }
    }
  }

  field-label {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);

    span {
      color: var(--foreground-l3);
      font-size: var(--step--1);
    }
  }

  field-error {
    display: block;
    color: var(--foreground-destructive);
    font-size: var(--step--1);
  }

  button[data-clear] {
    block-size: 2rem;
    color: var(--foreground-l3);
    background: transparent;
    border: none;
    border-radius: var(--radius-md);
    font-size: var(--step--1);
    cursor: pointer;

    &:hover {
      color: var(--foreground-l1);
      background: var(--background-l3);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -2px;
    }
  }
</style>

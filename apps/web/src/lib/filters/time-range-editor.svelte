<script lang="ts">
  import Input from '$lib/ui/input.svelte'
  import {
    clearTimeRangeFilter,
    hasTimeRangeFilter,
    resolveTimeRangeFilter,
    type TimeRangeFilter,
    type TimeRangeMode,
  } from './time'

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

  {#snippet boundField(
    label: string,
    type: string,
    value: string,
    placeholder: string | undefined,
    onValue: (value: string) => void
  )}
    <field-label>
      <span>{label}</span>
      <Input
        {type}
        {value}
        {placeholder}
        aria-invalid={!!error}
        oninput={event => edit(() => onValue(event.currentTarget.value))}
      />
    </field-label>
  {/snippet}

  {#if filter.mode === 'relative'}
    {@render boundField(
      'From',
      'text',
      filter.relativeStart,
      '2d 4h',
      v => (filter.relativeStart = v)
    )}
    {@render boundField(
      'To',
      'text',
      filter.relativeEnd,
      '2d 6h',
      v => (filter.relativeEnd = v)
    )}
  {:else}
    {@render boundField(
      'From',
      'datetime-local',
      filter.start,
      undefined,
      v => (filter.start = v)
    )}
    {@render boundField(
      'To',
      'datetime-local',
      filter.end,
      undefined,
      v => (filter.end = v)
    )}
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

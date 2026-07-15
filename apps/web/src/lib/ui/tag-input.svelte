<script lang="ts">
  import { IconX } from '$lib/icons'
  import Chip from '$lib/ui/chip.svelte'
  import { addTag, removeLastTag, removeTag } from '$lib/ui/tag-input-logic'
  import type { Snippet } from 'svelte'
  import type { HTMLInputAttributes } from 'svelte/elements'

  type Props = Omit<HTMLInputAttributes, 'onchange' | 'value'> & {
    value: string[]
    onchange?: (value: string[]) => void
    validate?: (entry: string) => boolean
    emptyPlaceholder?: string
    children?: Snippet<[{ item: string; index: number; remove: () => void }]>
  }

  let {
    value = $bindable([]),
    onchange,
    validate,
    placeholder = 'Add more...',
    emptyPlaceholder = 'Type and press Enter...',
    disabled = false,
    children,
    ...restProps
  }: Props = $props()

  let invalid = $state(false)
  let pending = $state('')
  let focused = $state(false)

  const hasPending = $derived(!!pending.trim() && !disabled)

  function commit(next: string[]) {
    value = next
    onchange?.(next)
  }

  function remove(index: number) {
    if (disabled) return
    commit(removeTag(value, index))
  }

  function handleKeydown(event: KeyboardEvent) {
    if (disabled) return
    if (event.key === 'Enter' && pending.trim()) {
      event.preventDefault()
      const result = addTag(value, pending, validate)
      if (result.kind === 'added') {
        commit(result.value)
        pending = ''
      } else if (result.kind === 'rejected') {
        invalid = true
        setTimeout(() => (invalid = false), 500)
      }
    } else if (event.key === 'Backspace' && !pending && value.length > 0) {
      commit(removeLastTag(value))
    }
  }
</script>

<tag-input
  data-invalid={invalid || undefined}
  data-pending={hasPending ? '' : undefined}
  data-disabled={disabled || undefined}
>
  {#each value as item, index (index)}
    {#if children}
      {@render children({ item, index, remove: () => remove(index) })}
    {:else}
      <Chip>
        <span class="label">{item}</span>
        {#if !disabled}
          <button
            type="button"
            onclick={() => remove(index)}
            aria-label="Remove {item}"
          >
            <IconX />
          </button>
        {/if}
      </Chip>
    {/if}
  {/each}
  <input
    type="text"
    bind:value={pending}
    placeholder={value.length === 0 ? emptyPlaceholder : placeholder}
    onkeydown={handleKeydown}
    onfocus={() => (focused = true)}
    onblur={() => (focused = false)}
    readonly={disabled || undefined}
    aria-disabled={disabled || undefined}
    {...restProps}
  />
</tag-input>
{#if hasPending}
  <tag-input-hint role="status" data-unsaved={!focused || undefined}>
    {focused ? 'Press Enter to add' : 'Unsaved text - press Enter to add it'}
  </tag-input-hint>
{/if}

<style>
  tag-input {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-3xs);
    inline-size: 100%;
    min-block-size: 2.25rem;
    padding: var(--space-3xs) var(--space-2xs);
    background: var(--background-l4);
    border: 2px solid transparent;
    border-radius: var(--radius-md);

    &:focus-within {
      outline: 2px solid var(--ring);
      outline-offset: -1px;
    }

    &[data-invalid],
    &[data-pending]:not(:focus-within) {
      border-color: var(--foreground-destructive);
    }

    &[data-disabled] {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  tag-input-hint {
    display: block;
    font-size: var(--step--1);
    color: var(--foreground-l4);

    &[data-unsaved] {
      color: var(--foreground-destructive);
    }
  }

  .label {
    overflow: hidden;
    font-family: var(--font-mono);
    text-overflow: ellipsis;
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.0625rem;
    color: inherit;
    cursor: pointer;
    border-radius: var(--radius-sm);

    &:hover {
      color: var(--foreground-destructive);
      background: var(--background-destructive);
    }

    :global(svg) {
      inline-size: 0.75rem;
      block-size: 0.75rem;
    }
  }

  input {
    flex: 1;
    min-inline-size: 6rem;
    padding-block: 0.125rem;
    color: var(--foreground-l0);
    background: transparent;
    border: none;
    outline: none;

    &::placeholder {
      color: var(--foreground-l4);
    }

    tag-input[data-disabled] & {
      cursor: not-allowed;
    }
  }
</style>

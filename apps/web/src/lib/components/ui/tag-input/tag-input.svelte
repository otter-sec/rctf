<script lang="ts">
  import { IconX } from '$lib/icons'
  import type { Snippet } from 'svelte'

  interface Props {
    value: string[]
    onchange?: (value: string[]) => void
    placeholder?: string
    emptyPlaceholder?: string
    disabled?: boolean
    class?: string
    children?: Snippet<[{ item: string; index: number; remove: () => void }]>
  }

  let {
    value = $bindable([]),
    onchange,
    placeholder = 'Add more...',
    emptyPlaceholder = 'Type and press Enter...',
    disabled = false,
    class: className = '',
    children,
  }: Props = $props()

  function add(newValue: string) {
    if (!newValue.trim()) return
    const updated = [...value, newValue.trim()]
    value = updated
    onchange?.(updated)
  }

  function remove(index: number) {
    const updated = value.filter((_, i) => i !== index)
    value = updated
    onchange?.(updated)
  }

  function handleKeydown(e: KeyboardEvent) {
    const input = e.currentTarget as HTMLInputElement
    if (e.key === 'Enter' && input.value.trim()) {
      e.preventDefault()
      add(input.value)
      input.value = ''
    } else if (e.key === 'Backspace' && !input.value && value.length > 0) {
      remove(value.length - 1)
    }
  }
</script>

<div
  class="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border bg-background-l1 px-2 py-1.5
    focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2
    {disabled ? 'cursor-not-allowed opacity-50' : ''} {className}">
  {#each value as item, i (i)}
    {#if children}
      {@render children({ item, index: i, remove: () => remove(i) })}
    {:else}
      <span
        class="inline-flex items-center gap-1 rounded-md bg-background-l3 px-2 py-0.5 font-mono text-sm">
        {item}
        {#if !disabled}
          <button
            type="button"
            class="ml-0.5 rounded-sm hover:bg-background-l4"
            onclick={() => remove(i)}>
            <IconX class="size-3" />
          </button>
        {/if}
      </span>
    {/if}
  {/each}
  <input
    type="text"
    class="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-foreground-l4"
    placeholder={value.length === 0 ? emptyPlaceholder : placeholder}
    onkeydown={handleKeydown}
    {disabled} />
</div>

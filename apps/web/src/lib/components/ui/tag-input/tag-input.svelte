<script lang="ts">
  import { IconX } from '$lib/icons'
  import { cn, type WithElementRef } from '$lib/utils'
  import type { Snippet } from 'svelte'
  import type { HTMLInputAttributes } from 'svelte/elements'

  type Props = WithElementRef<Omit<HTMLInputAttributes, 'onchange'>> & {
    value: string[]
    onchange?: (value: string[]) => void
    validate?: (value: string) => boolean
    emptyPlaceholder?: string
    children?: Snippet<[{ item: string; index: number; remove: () => void }]>
  }

  let {
    ref = $bindable(null),
    value = $bindable([]),
    onchange,
    validate,
    placeholder = 'Add more...',
    emptyPlaceholder = 'Type and press Enter...',
    disabled = false,
    class: className,
    children,
    ...restProps
  }: Props = $props()

  let invalid = $state(false)

  function add(newValue: string) {
    const trimmed = newValue.trim()
    if (!trimmed) return
    if (validate && !validate(trimmed)) {
      invalid = true
      setTimeout(() => (invalid = false), 500)
      return false
    }
    const updated = [...value, trimmed]
    value = updated
    onchange?.(updated)
    return true
  }

  function remove(index: number) {
    if (disabled) return
    const updated = value.filter((_: string, i: number) => i !== index)
    value = updated
    onchange?.(updated)
  }

  function handleKeydown(e: KeyboardEvent) {
    const input = e.currentTarget as HTMLInputElement
    if (e.key === 'Enter' && input.value.trim()) {
      e.preventDefault()
      if (add(input.value)) {
        input.value = ''
      }
    } else if (e.key === 'Backspace' && !input.value && value.length > 0) {
      remove(value.length - 1)
    }
  }
</script>

<div
  data-slot="tag-input"
  data-invalid={invalid || undefined}
  class={cn(
    'bg-background-l4 flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border px-2 py-1 transition-colors',
    'has-focus-visible:border-ring has-focus-visible:ring-ring/50 has-focus-visible:ring-[3px]',
    'has-[:aria-invalid=true]:ring-foreground-destructive/20 has-[:aria-invalid=true]:border-foreground-destructive',
    'data-invalid:border-foreground-destructive data-invalid:ring-foreground-destructive/20 data-invalid:ring-[3px]',
    disabled && 'cursor-not-allowed opacity-50',
    className
  )}
>
  {#each value as item, i (i)}
    {#if children}
      {@render children({ item, index: i, remove: () => remove(i) })}
    {:else}
      <span
        class="inline-flex items-center gap-1 rounded bg-background-l5 px-1.5 py-0.5 font-mono text-sm"
      >
        {item}
        {#if !disabled}
          <button
            type="button"
            onclick={() => remove(i)}
            aria-label="Remove {item}"
            class="rounded p-0.5 hover:bg-background-destructive hover:text-foreground-destructive"
          >
            <IconX class="size-3" />
          </button>
        {/if}
      </span>
    {/if}
  {/each}
  <input
    bind:this={ref}
    type="text"
    class="min-w-24 flex-1 bg-transparent py-0.5 text-sm outline-none placeholder:text-foreground-l4 disabled:cursor-not-allowed"
    placeholder={value.length === 0 ? emptyPlaceholder : placeholder}
    onkeydown={handleKeydown}
    {disabled}
    {...restProps}
  />
</div>

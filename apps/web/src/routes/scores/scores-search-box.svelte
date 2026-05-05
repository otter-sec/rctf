<script lang="ts">
  import { Spinner } from '$lib/components'
  import { IconSearch, IconX } from '$lib/icons'
  import { cn } from '$lib/utils'

  interface Props {
    search: string
    isSearching: boolean
    inputRef?: HTMLInputElement | null
    class?: string
    inputClass?: string
    onSearchChange: (value: string) => void
  }

  let {
    search,
    isSearching,
    inputRef = $bindable(null),
    class: className,
    inputClass,
    onSearchChange,
  }: Props = $props()
</script>

<div class={cn('bg-background-l2 flex h-9 items-center gap-1.5 rounded-md px-2.5', className)}>
  {#if isSearching}
    <Spinner class="text-foreground-l3 size-4 shrink-0" />
  {:else}
    <IconSearch class="text-foreground-l3 size-4 shrink-0" />
  {/if}
  <input
    bind:this={inputRef}
    type="text"
    aria-label="Search teams"
    placeholder="Search teams..."
    value={search}
    oninput={e => onSearchChange(e.currentTarget.value)}
    class={cn(
      'placeholder:text-foreground-l3 text-foreground-l1 bg-transparent text-sm outline-none',
      inputClass
    )}
  />
  <button
    type="button"
    aria-label="Clear team search"
    class={cn(
      'text-foreground-l3 hover:text-foreground-l1 -mr-0.5 flex size-4 shrink-0 items-center justify-center rounded transition-colors',
      !search && 'pointer-events-none opacity-0'
    )}
    tabindex={search ? 0 : -1}
    onclick={() => onSearchChange('')}
  >
    <IconX class="size-3" />
  </button>
</div>

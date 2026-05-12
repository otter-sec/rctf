<script lang="ts">
  import { ScrollArea, Spinner } from '$lib/components'
  import { cn } from '$lib/utils'
  import SubmissionsFilterOption from './filter-option.svelte'
  import SubmissionsFilterSearchInput from './filter-search-input.svelte'
  import type { ValueFilterFamily } from './ui'

  interface Props {
    family: ValueFilterFamily
    searchable?: boolean
    mobile?: boolean
  }

  let { family, searchable = false, mobile = false }: Props = $props()
  const options = $derived(family.options())
</script>

{#snippet optionList()}
  <div class={cn(mobile && 'flex flex-col gap-1 p-2', !mobile && searchable && 'p-1')}>
    {#if family.loading?.()}
      <div
        class={mobile
          ? 'text-foreground-l3 flex items-center gap-2 px-2 py-8 text-sm'
          : 'text-foreground-l3 flex items-center gap-2 px-2 py-1.5 text-sm'}
      >
        <Spinner class="size-3.5" />
        {family.loadingLabel}
      </div>
    {:else if options.length === 0}
      <div
        class={mobile
          ? 'text-foreground-l3 px-2 py-8 text-center text-sm'
          : 'text-foreground-l3 px-2 py-1.5 text-sm'}
      >
        {family.emptyLabel}
      </div>
    {:else}
      {#each options as option (family.optionKey(option))}
        <SubmissionsFilterOption {family} {option} {mobile} />
      {/each}
    {/if}
  </div>
{/snippet}

{#if searchable && family.search}
  <SubmissionsFilterSearchInput
    value={family.search.value()}
    placeholder={family.search.placeholder}
    onInput={family.search.onInput}
  />
  <ScrollArea
    class="min-h-0 flex-1"
    fadeSize={28}
    fadeColor="background-l4"
    scrollbarYClasses="hidden"
  >
    {@render optionList()}
  </ScrollArea>
{:else}
  {@render optionList()}
{/if}

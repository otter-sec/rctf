<script lang="ts">
  import { tick } from 'svelte'
  import { Command, Popover } from '$lib/components'
  import { IconCheck, IconSelector } from '$lib/icons'
  import { cn, countryCodeToFlagFilename } from '$lib/utils'
  import { ALL_REGIONS, COUNTRIES, SPECIAL_REGIONS, TERRITORIES } from '$lib/utils/countries'

  interface Props {
    value: string | null | undefined
    onValueChange?: (value: string | null) => void
    disabled?: boolean
    class?: string
  }

  let { value = $bindable(), onValueChange, disabled = false, class: className }: Props = $props()

  let open = $state(false)
  let triggerRef = $state<HTMLButtonElement>(null!)

  const selectedRegion = $derived(ALL_REGIONS.find(c => c.code === value))
  const flagFilename = $derived(value ? countryCodeToFlagFilename(value) : null)

  function closeAndFocusTrigger() {
    open = false
    tick().then(() => {
      triggerRef.focus()
    })
  }

  function handleSelect(code: string | null) {
    value = code
    onValueChange?.(code)
    closeAndFocusTrigger()
  }
</script>

{#snippet regionItem(code: string, name: string)}
  {@const regionFlagFilename = countryCodeToFlagFilename(code)}
  <Command.Item value={name} onSelect={() => handleSelect(code)}>
    <IconCheck class={cn('size-4', value !== code && 'text-transparent')} />
    <img src="/flags/{regionFlagFilename}" alt="{code} flag" class="h-6 w-auto shrink-0" />
    <span class="truncate">{name}</span>
  </Command.Item>
{/snippet}

<Popover.Root bind:open>
  <Popover.Trigger bind:ref={triggerRef}>
    {#snippet child({ props })}
      <button
        {...props}
        type="button"
        role="combobox"
        aria-expanded={open}
        {disabled}
        class={cn(
          'border-background-l4 bg-background-l2 hover:bg-background-l3 flex h-9 w-full items-center justify-between rounded-md border px-3 py-2 text-sm whitespace-nowrap',
          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
          'disabled:pointer-events-none disabled:opacity-50',
          className
        )}
      >
        {#if selectedRegion && flagFilename}
          <span class="flex items-center gap-2">
            <img
              src="/flags/{flagFilename}"
              alt="{selectedRegion.code} flag"
              class="h-6 w-auto shrink-0"
            />
            <span class="truncate text-base md:text-sm">{selectedRegion.name}</span>
          </span>
        {:else}
          <span class="text-foreground-l3">Select country...</span>
        {/if}
        <IconSelector class="text-foreground-l3 size-4 shrink-0" />
      </button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-[280px] p-0" align="start">
    <Command.Root>
      <Command.Input placeholder="Search country..." />
      <Command.List class="max-h-[300px]">
        <Command.Empty>No country found.</Command.Empty>
        <Command.Group>
          <Command.Item value="none" onSelect={() => handleSelect(null)}>
            <IconCheck class={cn('size-4', value !== null && 'text-transparent')} />
            <span class="text-foreground-l3">No country</span>
          </Command.Item>
        </Command.Group>
        <Command.Separator />
        <Command.Group heading="Countries">
          {#each COUNTRIES as country (country.code)}
            {@render regionItem(country.code, country.name)}
          {/each}
        </Command.Group>
        <Command.Separator />
        <Command.Group heading="Territories">
          {#each TERRITORIES as territory (territory.code)}
            {@render regionItem(territory.code, territory.name)}
          {/each}
        </Command.Group>
        <Command.Separator />
        <Command.Group heading="Special regions">
          {#each SPECIAL_REGIONS as region (region.code)}
            {@render regionItem(region.code, region.name)}
          {/each}
        </Command.Group>
      </Command.List>
    </Command.Root>
  </Popover.Content>
</Popover.Root>

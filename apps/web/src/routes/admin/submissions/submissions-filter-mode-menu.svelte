<script lang="ts">
  import { DropdownMenu } from '$lib/components'
  import { IconCheck, IconChevronDown } from '$lib/icons'
  import { cn } from '$lib/utils'
  import { filterOperatorLabel, includeOperatorLabel, type FilterMode } from './submissions-filters'

  interface Props {
    mode: FilterMode
    count: number
    onSelect: (mode: FilterMode) => void
  }

  let { mode, count, onSelect }: Props = $props()
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger
    class="text-foreground-l4 hover:bg-background-l3 hover:text-foreground-l2 flex h-full items-center gap-1 border-r-2 px-2 transition-colors"
  >
    {filterOperatorLabel(mode, count)}
    <IconChevronDown class="size-3" />
  </DropdownMenu.Trigger>
  <DropdownMenu.Content
    align="start"
    class="bg-background-l4 border-foreground-l4/40 z-[120] w-36 border-2 shadow-xl"
  >
    <DropdownMenu.Item
      class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2"
      onclick={() => onSelect('include')}
    >
      <IconCheck class={cn('size-4', mode !== 'include' && 'text-transparent')} />
      {includeOperatorLabel(count)}
    </DropdownMenu.Item>
    <DropdownMenu.Item
      class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2"
      onclick={() => onSelect('exclude')}
    >
      <IconCheck class={cn('size-4', mode !== 'exclude' && 'text-transparent')} />
      is not
    </DropdownMenu.Item>
  </DropdownMenu.Content>
</DropdownMenu.Root>

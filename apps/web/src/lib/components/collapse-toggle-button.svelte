<script lang="ts">
  import { Tooltip } from '$lib/components'
  import { IconFold } from '$lib/icons'
  import { cn } from '$lib/utils'

  interface Props {
    totalCount: number
    openCount: number
    onToggle: () => void
    class?: string
  }

  let { totalCount, openCount, onToggle, class: className }: Props = $props()

  const isAllCollapsed = $derived(openCount === 0 && totalCount > 0)
  const label = $derived(isAllCollapsed ? 'Expand all' : 'Collapse all')
</script>

<Tooltip.Root disableCloseOnTriggerClick>
  <Tooltip.Trigger
    onclick={onToggle}
    aria-label={label}
    class={cn(
      'flex flex-1 items-center justify-center rounded-sm px-4 py-2 @sm/list:flex-initial',
      isAllCollapsed
        ? 'bg-background-accent text-foreground-accent hover:bg-background-accent-hover'
        : 'bg-background-l4 text-foreground-l1 hover:bg-background-l5',
      className
    )}
  >
    <IconFold class="size-5 shrink-0" />
  </Tooltip.Trigger>
  <Tooltip.Content sideOffset={8}>{label}</Tooltip.Content>
</Tooltip.Root>

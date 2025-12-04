<script lang="ts">
  import { cn } from '$lib/utils'
  import { Tabs as TabsPrimitive } from 'bits-ui'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: TabsPrimitive.TriggerProps = $props()
</script>

<TabsPrimitive.Trigger
  bind:ref
  data-slot="tabs-trigger"
  class={cn(
    "data-[state=active]:bg-background-l4 data-[state=active]:text-foreground-l0 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-foreground-l3 inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent px-3 py-1 text-sm focus-visible:outline-1 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
    className
  )}
  {...restProps} />

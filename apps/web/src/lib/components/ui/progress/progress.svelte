<script lang="ts">
  import { cn, type WithoutChildrenOrChild } from '$lib/utils'
  import { Progress as ProgressPrimitive } from 'bits-ui'

  let {
    ref = $bindable(null),
    class: className,
    max = 100,
    value,
    ...restProps
  }: WithoutChildrenOrChild<ProgressPrimitive.RootProps> = $props()
</script>

<ProgressPrimitive.Root
  bind:ref
  data-slot="progress"
  class={cn('bg-background-accent relative h-2 w-full overflow-hidden rounded-full', className)}
  {value}
  {max}
  {...restProps}
>
  <div
    data-slot="progress-indicator"
    class="bg-foreground-accent h-full w-full flex-1 transition-all"
    style="transform: translateX(-{100 - (100 * (value ?? 0)) / (max ?? 1)}%)"
  ></div>
</ProgressPrimitive.Root>

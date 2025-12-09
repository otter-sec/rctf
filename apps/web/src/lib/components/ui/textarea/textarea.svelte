<script lang="ts">
  import { cn, type WithElementRef, type WithoutChildren } from '$lib/utils'
  import type { HTMLTextareaAttributes } from 'svelte/elements'

  let {
    ref = $bindable(null),
    value = $bindable(),
    class: className,
    'data-slot': dataSlot = 'textarea',
    ...restProps
  }: WithoutChildren<WithElementRef<HTMLTextareaAttributes>> = $props()
</script>

<textarea
  bind:this={ref}
  data-slot={dataSlot}
  class={cn(
    'bg-background-l4 placeholder:text-foreground-l3 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-foreground-destructive/20 aria-invalid:border-foreground-destructive flex field-sizing-content min-h-16 w-full rounded-md border px-3 py-2 text-base outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
    className
  )}
  bind:value
  {...restProps}
></textarea>

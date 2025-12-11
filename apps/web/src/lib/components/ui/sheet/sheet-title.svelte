<script lang="ts">
  import { cn } from '$lib/utils'
  import { Dialog as SheetPrimitive } from 'bits-ui'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: SheetPrimitive.TitleProps = $props()
</script>

<SheetPrimitive.Title
  bind:ref
  data-slot="sheet-title"
  class={cn('text-foreground-l0 font-semibold', className)}
  {...restProps}
/>

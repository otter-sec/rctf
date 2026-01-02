<script lang="ts">
  import { cn } from '$lib/utils'
  import { Label as LabelPrimitive } from 'bits-ui'

  let { ref = $bindable(null), class: className, ...restProps }: LabelPrimitive.RootProps = $props()
</script>

<LabelPrimitive.Root
  bind:ref
  data-slot="label"
  class={cn(
    'flex items-center gap-x-2 gap-y-1 text-sm leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
    className
  )}
  {...restProps}
/>

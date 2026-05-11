<script lang="ts" generics="Payload = never">
  import { Tooltip as TooltipPrimitive } from 'bits-ui'

  let { ref = $bindable(null), ...restProps }: TooltipPrimitive.TriggerProps<Payload> = $props()
</script>

<TooltipPrimitive.Trigger bind:ref data-slot="tooltip-trigger" {...restProps} />

<script lang="ts" generics="Payload = never">
  import { Tooltip as TooltipPrimitive } from 'bits-ui'

  let {
    open = $bindable(false),
    triggerId = $bindable(null),
    ignoreNonKeyboardFocus = true,
    ...restProps
  }: TooltipPrimitive.RootProps<Payload> = $props()
</script>

<TooltipPrimitive.Root bind:open bind:triggerId {ignoreNonKeyboardFocus} {...restProps} />

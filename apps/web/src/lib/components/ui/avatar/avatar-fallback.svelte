<script lang="ts">
  import { cn } from '$lib/utils'
  import { Avatar as AvatarPrimitive } from 'bits-ui'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: AvatarPrimitive.FallbackProps = $props()
</script>

<AvatarPrimitive.Fallback
  bind:ref
  data-slot="avatar-fallback"
  class={cn(
    'bg-background-l3 text-foreground-l3 flex size-full items-center justify-center rounded-md',
    className
  )}
  {...restProps} />

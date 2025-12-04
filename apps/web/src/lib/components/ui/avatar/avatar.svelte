<script lang="ts">
  import { cn } from '$lib/utils'
  import { Avatar as AvatarPrimitive } from 'bits-ui'

  let {
    ref = $bindable(null),
    loadingStatus = $bindable('loading'),
    class: className,
    ...restProps
  }: AvatarPrimitive.RootProps = $props()
</script>

<AvatarPrimitive.Root
  bind:ref
  bind:loadingStatus
  data-slot="avatar"
  class={cn('relative flex size-12 shrink-0 overflow-hidden rounded-md', className)}
  {...restProps} />

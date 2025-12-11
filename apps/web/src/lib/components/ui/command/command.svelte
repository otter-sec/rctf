<script lang="ts">
  import { cn } from '$lib/utils'
  import { Command as CommandPrimitive } from 'bits-ui'

  export type CommandRootApi = CommandPrimitive.Root

  let {
    api = $bindable(null),
    ref = $bindable(null),
    value = $bindable(''),
    class: className,
    ...restProps
  }: CommandPrimitive.RootProps & {
    api?: CommandRootApi | null
  } = $props()
</script>

<CommandPrimitive.Root
  bind:this={api}
  bind:value
  bind:ref
  data-slot="command"
  class={cn(
    'bg-background-l1 text-foreground-l0 flex h-full w-full flex-col overflow-hidden rounded-md',
    className
  )}
  {...restProps}
/>

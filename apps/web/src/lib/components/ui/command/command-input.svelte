<script lang="ts">
  import { IconSearch } from '$lib/icons'
  import { cn } from '$lib/utils'
  import { Command as CommandPrimitive } from 'bits-ui'

  let {
    ref = $bindable(null),
    class: className,
    value = $bindable(''),
    ...restProps
  }: CommandPrimitive.InputProps = $props()
</script>

<div class="flex h-9 items-center gap-2 border-b ps-3 pe-8" data-slot="command-input-wrapper">
  <IconSearch class="text-foreground-l3 size-4 shrink-0" />
  <CommandPrimitive.Input
    data-slot="command-input"
    class={cn(
      'placeholder:text-foreground-l3 flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    bind:ref
    {...restProps}
    bind:value
  />
</div>

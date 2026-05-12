<script lang="ts">
  import { IconCheck, IconMinus } from '$lib/icons'
  import { cn, type WithoutChildrenOrChild } from '$lib/utils'
  import { Checkbox as CheckboxPrimitive } from 'bits-ui'

  let {
    ref = $bindable(null),
    checked = $bindable(false),
    indeterminate = $bindable(false),
    class: className,
    ...restProps
  }: WithoutChildrenOrChild<CheckboxPrimitive.RootProps> = $props()
</script>

<CheckboxPrimitive.Root
  bind:ref
  data-slot="checkbox"
  class={cn(
    'bg-background-l2 data-[state=checked]:bg-foreground-l0 data-[state=checked]:text-background-l0 data-[state=checked]:border-foreground-l0 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-foreground-destructive/20 aria-invalid:border-foreground-destructive peer flex size-4 shrink-0 items-center justify-center rounded-lg border transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
    className
  )}
  bind:checked
  bind:indeterminate
  {...restProps}
>
  {#snippet children({ checked, indeterminate })}
    <div data-slot="checkbox-indicator" class="text-current transition-none">
      {#if checked}
        <IconCheck class="size-3.5" />
      {:else if indeterminate}
        <IconMinus class="size-3.5" />
      {/if}
    </div>
  {/snippet}
</CheckboxPrimitive.Root>

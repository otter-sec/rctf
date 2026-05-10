<script lang="ts">
  import { IconChevronRight } from '$lib/icons'
  import { cn, type WithoutChild } from '$lib/utils'
  import { Accordion as AccordionPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  let {
    ref = $bindable(null),
    class: className,
    headerClass,
    chevronClass,
    level = 3,
    children,
    trailing,
    ...restProps
  }: WithoutChild<AccordionPrimitive.TriggerProps> & {
    level?: AccordionPrimitive.HeaderProps['level']
    headerClass?: string
    chevronClass?: string
    trailing?: Snippet
  } = $props()
</script>

<AccordionPrimitive.Header {level} class={cn('flex', headerClass)}>
  <AccordionPrimitive.Trigger
    data-slot="accordion-trigger"
    bind:ref
    class={cn(
      'focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 cursor-pointer items-center py-4 text-start text-sm outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-inset disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]_.accordion-chevron]:rotate-90',
      className
    )}
    {...restProps}
  >
    <div class="flex flex-1 items-center justify-between gap-4 opacity-75">
      {@render children?.()}
      <div class="flex items-center gap-2">
        {#if trailing}
          {@render trailing()}
        {/if}
        <IconChevronRight
          class={cn(
            'accordion-chevron text-foreground-l3 pointer-events-none size-5 shrink-0',
            chevronClass
          )}
        />
      </div>
    </div>
  </AccordionPrimitive.Trigger>
</AccordionPrimitive.Header>

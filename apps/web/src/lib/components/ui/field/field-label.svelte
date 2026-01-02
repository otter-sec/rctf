<script lang="ts">
  import { Label } from '$lib/components/ui/label/index.js'
  import { cn } from '$lib/utils'
  import type { ComponentProps } from 'svelte'

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: ComponentProps<typeof Label> = $props()
</script>

<Label
  bind:ref
  data-slot="field-label"
  class={cn(
    'group/field-label peer/field-label flex w-fit flex-wrap leading-snug group-data-[disabled=true]/field:opacity-50',
    'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border *:data-[slot=field]:p-4',
    'has-data-[state=checked]:bg-background-accent/5 has-data-[state=checked]:border-background-accent',
    className
  )}
  {...restProps}
>
  {@render children?.()}
</Label>

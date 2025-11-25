<script lang="ts">
  import { cn, type WithElementRef } from '$lib/utils.js'
  import type {
    HTMLInputAttributes,
    HTMLInputTypeAttribute,
  } from 'svelte/elements'

  type InputType = Exclude<HTMLInputTypeAttribute, 'file'>

  type Props = WithElementRef<
    Omit<HTMLInputAttributes, 'type'> &
      (
        | { type: 'file'; files?: FileList }
        | { type?: InputType; files?: undefined }
      )
  >

  let {
    ref = $bindable(null),
    value = $bindable(),
    type,
    files = $bindable(),
    class: className,
    'data-slot': dataSlot = 'input',
    ...restProps
  }: Props = $props()
</script>

{#if type === 'file'}
  <input
    bind:this={ref}
    data-slot={dataSlot}
    class={cn(
      'selection:bg-background-accent selection:text-foreground-accent placeholder:text-foreground-l3 shadow-xs flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 pt-1.5 text-sm font-medium outline-none disabled:cursor-not-allowed disabled:opacity-50',
      'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
      'aria-invalid:ring-foreground-destructive/20 aria-invalid:border-foreground-destructive',
      className
    )}
    type="file"
    bind:files
    bind:value
    {...restProps}
  />
{:else}
  <input
    bind:this={ref}
    data-slot={dataSlot}
    class={cn(
      'bg-background-l1 selection:bg-background-accent selection:text-foreground-accent placeholder:text-foreground-l3 shadow-xs flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
      'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
      'aria-invalid:ring-foreground-destructive/20 aria-invalid:border-foreground-destructive',
      className
    )}
    {type}
    bind:value
    {...restProps}
  />
{/if}

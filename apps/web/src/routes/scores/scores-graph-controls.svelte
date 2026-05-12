<script lang="ts">
  import { Tooltip } from '$lib/components'
  import { IconMoodHappy, IconMoodHappyFilled, IconPin, IconPinnedFilled } from '$lib/icons'
  import { cn } from '$lib/utils'
  import { mergeProps } from 'bits-ui'

  interface Props {
    showTop3Context: boolean
    showSelfContext: boolean
    onShowTop3ContextChange: (value: boolean) => void
    onShowSelfContextChange: (value: boolean) => void
  }

  let {
    showTop3Context,
    showSelfContext,
    onShowTop3ContextChange,
    onShowSelfContextChange,
  }: Props = $props()

  const tooltipTether = Tooltip.createTether<string>()
</script>

<div
  class="absolute top-2 left-2 z-10 flex gap-1 opacity-0 transition-all group-focus-within/graph:opacity-100 group-hover/graph:opacity-100"
>
  <Tooltip.Trigger tether={tooltipTether} payload="Pin top 3 to graph">
    {#snippet child({ props })}
      {@const buttonProps = mergeProps(props, {
        onclick: () => onShowTop3ContextChange(!showTop3Context),
        'aria-label': 'Pin top 3 to graph',
      })}
      <button
        {...buttonProps}
        type="button"
        class={cn(
          'text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l3 focus-visible:ring-ring/50 flex size-7 items-center justify-center rounded-md outline-none focus-visible:ring-[3px]',
          showTop3Context && 'bg-background-l3/80 text-foreground-l1'
        )}
      >
        {#if showTop3Context}
          <IconPinnedFilled class="size-3.5" />
        {:else}
          <IconPin class="size-3.5" />
        {/if}
      </button>
    {/snippet}
  </Tooltip.Trigger>
  <Tooltip.Trigger tether={tooltipTether} payload="Pin self to graph">
    {#snippet child({ props })}
      {@const buttonProps = mergeProps(props, {
        onclick: () => onShowSelfContextChange(!showSelfContext),
        'aria-label': 'Pin self to graph',
      })}
      <button
        {...buttonProps}
        type="button"
        class={cn(
          'text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l3 focus-visible:ring-ring/50 flex size-7 items-center justify-center rounded-md outline-none focus-visible:ring-[3px]',
          showSelfContext && 'bg-background-l3/80 text-foreground-l1'
        )}
      >
        {#if showSelfContext}
          <IconMoodHappyFilled class="size-3.5" />
        {:else}
          <IconMoodHappy class="size-3.5" />
        {/if}
      </button>
    {/snippet}
  </Tooltip.Trigger>
</div>

<Tooltip.Root tether={tooltipTether} disableCloseOnTriggerClick>
  {#snippet children({ payload })}
    {#if payload}
      <Tooltip.Content side="bottom" sideOffset={6}>{payload}</Tooltip.Content>
    {/if}
  {/snippet}
</Tooltip.Root>

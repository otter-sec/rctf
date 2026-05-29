<script lang="ts">
  import { Tooltip } from '$lib/components'
  import { IconMoodHappy, IconMoodHappyFilled, IconPin, IconPinnedFilled } from '$lib/icons'
  import { cn } from '$lib/utils'

  interface Props {
    showTop3Context?: boolean
    showSelfContext?: boolean
  }

  let { showTop3Context = $bindable(true), showSelfContext = $bindable(true) }: Props = $props()

  const buttonClass = cn(
    'flex size-7 items-center justify-center rounded-md outline-none',
    'text-foreground-l3 hover:bg-background-l3 hover:text-foreground-l1',
    'focus-visible:ring-ring/50 focus-visible:ring-[3px]',
    'data-[active]:bg-background-l3 data-[active]:text-foreground-l1'
  )
</script>

<div class="flex gap-1">
  <Tooltip.Root>
    <Tooltip.Trigger
      type="button"
      class={buttonClass}
      aria-label="Pin top 3 to graph"
      data-active={showTop3Context ? '' : undefined}
      onclick={() => (showTop3Context = !showTop3Context)}
    >
      {#if showTop3Context}
        <IconPinnedFilled class="size-3.5" />
      {:else}
        <IconPin class="size-3.5" />
      {/if}
    </Tooltip.Trigger>
    <Tooltip.Content side="bottom" sideOffset={6}>Pin top 3 to graph</Tooltip.Content>
  </Tooltip.Root>

  <Tooltip.Root>
    <Tooltip.Trigger
      type="button"
      class={buttonClass}
      aria-label="Pin self to graph"
      data-active={showSelfContext ? '' : undefined}
      onclick={() => (showSelfContext = !showSelfContext)}
    >
      {#if showSelfContext}
        <IconMoodHappyFilled class="size-3.5" />
      {:else}
        <IconMoodHappy class="size-3.5" />
      {/if}
    </Tooltip.Trigger>
    <Tooltip.Content side="bottom" sideOffset={6}>Pin self to graph</Tooltip.Content>
  </Tooltip.Root>
</div>

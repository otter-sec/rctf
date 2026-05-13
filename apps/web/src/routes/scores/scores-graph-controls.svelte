<script lang="ts">
  import { Tooltip } from '$lib/components'
  import { IconMoodHappy, IconMoodHappyFilled, IconPin, IconPinnedFilled } from '$lib/icons'
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

<graph-controls>
  <Tooltip.Trigger tether={tooltipTether} payload="Pin top 3 to graph">
    {#snippet child({ props })}
      {@const buttonProps = mergeProps(props, {
        onclick: () => onShowTop3ContextChange(!showTop3Context),
        'aria-label': 'Pin top 3 to graph',
      })}
      <button {...buttonProps} type="button" data-active={showTop3Context ? '' : undefined}>
        {#if showTop3Context}
          <IconPinnedFilled class="icon" />
        {:else}
          <IconPin class="icon" />
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
      <button {...buttonProps} type="button" data-active={showSelfContext ? '' : undefined}>
        {#if showSelfContext}
          <IconMoodHappyFilled class="icon" />
        {:else}
          <IconMoodHappy class="icon" />
        {/if}
      </button>
    {/snippet}
  </Tooltip.Trigger>
</graph-controls>

<Tooltip.Root tether={tooltipTether} disableCloseOnTriggerClick>
  {#snippet children({ payload })}
    {#if payload}
      <Tooltip.Content side="bottom" sideOffset={6}>{payload}</Tooltip.Content>
    {/if}
  {/snippet}
</Tooltip.Root>

<style>
  graph-controls {
    position: absolute;
    inset-block-start: calc(var(--spacing) * 2);
    inset-inline-start: calc(var(--spacing) * 2);
    z-index: 10;
    display: flex;
    gap: calc(var(--spacing) * 1);
    opacity: 0;
    transition: opacity 150ms ease;

    &:hover,
    &:focus-within,
    :global(mobile-graph:hover) &,
    :global(mobile-graph:focus-within) &,
    :global(header-graph-cell:hover) &,
    :global(header-graph-cell:focus-within) & {
      opacity: 1;
    }

    button {
      width: calc(var(--spacing) * 7);
      height: calc(var(--spacing) * 7);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: var(--radius-md);
      outline: none;
      background: transparent;
      color: var(--foreground-l3);

      &:hover,
      &:focus-visible {
        color: var(--foreground-l1);
        background: var(--background-l3);
      }

      &:focus-visible {
        box-shadow: 0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent);
      }

      &[data-active] {
        color: var(--foreground-l1);
        background: color-mix(in oklab, var(--background-l3) 80%, transparent);
      }
    }

    :global(.icon) {
      width: calc(var(--spacing) * 3.5);
      height: calc(var(--spacing) * 3.5);
    }
  }
</style>

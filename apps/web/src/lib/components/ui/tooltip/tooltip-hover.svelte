<script lang="ts" generics="Payload">
  import type { HoverTooltipController } from '$lib/utils'
  import { Tooltip as TooltipPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'
  import Content from './tooltip-content.svelte'

  interface Props {
    controller: HoverTooltipController<Payload>
    side?: TooltipPrimitive.ContentProps['side']
    sideOffset?: number
    children: Snippet<[Payload]>
  }

  let { controller, side = 'top', sideOffset = 8, children: content }: Props = $props()
</script>

<TooltipPrimitive.Root
  bind:open={controller.open}
  onOpenChangeComplete={controller.onOpenChangeComplete}
>
  {#snippet children()}
    {#if controller.payload !== null}
      <Content {side} {sideOffset} customAnchor={controller.anchor}>
        {@render content(controller.payload)}
      </Content>
    {/if}
  {/snippet}
</TooltipPrimitive.Root>

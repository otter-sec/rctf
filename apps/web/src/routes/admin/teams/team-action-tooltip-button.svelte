<script lang="ts">
  import { Button, Spinner, Tooltip, type ButtonVariant } from '$lib/components'
  import { mergeProps } from 'bits-ui'
  import type { Tooltip as TooltipPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  interface Props {
    tether: TooltipPrimitive.Tether<string>
    label: string
    variant?: ButtonVariant
    disabled?: boolean
    loading?: boolean
    onclick: () => void
    children: Snippet
  }

  let {
    tether,
    label,
    variant = 'secondary',
    disabled = false,
    loading = false,
    onclick,
    children,
  }: Props = $props()
</script>

<Tooltip.Trigger {tether} payload={label} {disabled}>
  {#snippet child({ props })}
    {@const buttonProps = mergeProps(props, { onclick, 'aria-label': label })}
    <Button {...buttonProps} {variant} size="icon" class="size-8" {disabled}>
      {#if loading}
        <Spinner class="size-4" />
      {:else}
        {@render children()}
      {/if}
    </Button>
  {/snippet}
</Tooltip.Trigger>

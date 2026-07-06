<!--
  Confirmation dialog for the admin team actions (mint token, mint login URL,
  ban, delete, revoke solve). Presentational only: the parent owns `open` and the
  per-action pending spinner, and runs the real work in `onConfirm`. Confirming
  closes the dialog first, so the triggering button surfaces its own spinner.
-->
<script lang="ts">
  import { mergeProps } from '@zag-js/svelte'
  import Button from '$lib/ui/button.svelte'
  import Dialog from '$lib/ui/dialog.svelte'

  type Props = {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    message: string
    confirmLabel: string
    destructive?: boolean
    onConfirm: () => void
  }

  let {
    open,
    onOpenChange,
    title,
    message,
    confirmLabel,
    destructive = false,
    onConfirm,
  }: Props = $props()
</script>

<Dialog {open} {onOpenChange} {title} description={message}>
  {#snippet children({ closeProps })}
    <confirm-actions>
      <Button {...closeProps} variant="secondary">Cancel</Button>
      <Button
        {...mergeProps(closeProps, { onclick: onConfirm })}
        variant={destructive ? 'destructive' : 'default'}
      >
        {confirmLabel}
      </Button>
    </confirm-actions>
  {/snippet}
</Dialog>

<style>
  confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2xs);
  }
</style>

<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    label: string
    width?: string
    trigger: Snippet<[{ props: Record<string, unknown>; open: boolean }]>
    panel: Snippet<[{ close: () => void }]>
  }

  let { label, width, trigger, panel }: Props = $props()

  let open = $state(false)
  let root: HTMLElement | undefined
  const panelId = $props.id()

  function attachRoot(node: HTMLElement) {
    root = node
    return () => {
      root = undefined
    }
  }

  function close() {
    open = false
  }

  function focusTrigger() {
    root?.querySelector<HTMLElement>('[data-popover-trigger]')?.focus()
  }

  function onWindowPointerdown(event: PointerEvent) {
    if (open && root && !root.contains(event.target as Node)) close()
  }

  function onWindowKeydown(event: KeyboardEvent) {
    if (open && event.key === 'Escape') {
      event.stopPropagation()
      close()
      focusTrigger()
    }
  }

  const triggerProps = $derived({
    'aria-haspopup': 'dialog',
    'aria-expanded': open,
    'aria-controls': open ? panelId : undefined,
    'data-popover-trigger': '',
    'data-state': open ? 'open' : 'closed',
    onclick: () => (open = !open),
  })
</script>

<svelte:window onpointerdowncapture={onWindowPointerdown} onkeydown={onWindowKeydown} />

<filter-popover {@attach attachRoot}>
  {@render trigger({ props: triggerProps, open })}
  {#if open}
    <filter-popover-panel
      id={panelId}
      role="dialog"
      aria-label={label}
      style:--popover-width={width}
    >
      {@render panel({ close })}
    </filter-popover-panel>
  {/if}
</filter-popover>

<style>
  filter-popover {
    position: relative;
    display: inline-flex;
    min-inline-size: 0;
  }

  filter-popover-panel {
    position: absolute;
    inset-block-start: calc(100% + 0.375rem);
    inset-inline-start: 0;
    z-index: var(--layer-popover);
    display: flex;
    flex-direction: column;
    inline-size: var(--popover-width, max-content);
    max-inline-size: min(90vw, 24rem);
    background: var(--background-l1);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
</style>

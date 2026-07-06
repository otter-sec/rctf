<script lang="ts">
  import * as dialog from '@zag-js/dialog'
  import { normalizeProps, useMachine } from '@zag-js/svelte'
  import Portal from '$lib/ui/portal.svelte'
  import type { Snippet } from 'svelte'

  type Props = {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    title: string
    titleHidden?: boolean
    description?: string
    presentation?: 'center' | 'sheet' | 'drawer'
    /** Remove the content shell's own gap/padding; the consumer owns spacing. */
    flush?: boolean
    children: Snippet<[{ closeProps: Record<string, unknown> }]>
    trigger?: Snippet<[{ props: Record<string, unknown> }]>
  }

  let {
    open = $bindable(false),
    onOpenChange,
    title,
    titleHidden = false,
    description,
    presentation = 'center',
    flush = false,
    children,
    trigger,
  }: Props = $props()

  const id = $props.id()
  // Zag thunk rule: controlled props passed as a plain object silently freeze
  const service = useMachine(dialog.machine, () => ({
    id,
    open,
    onOpenChange(details: { open: boolean }) {
      if (onOpenChange) {
        // Controlled: the consumer owns `open` (e.g. drives it from page.state).
        // Self-mutating here would fight that control and flash the dialog.
        onOpenChange(details.open)
      } else {
        // Uncontrolled / bind:open: manage our own visibility.
        open = details.open
      }
    },
  }))
  const api = $derived(dialog.connect(service, normalizeProps))

  const triggerProps = $derived(api.getTriggerProps() as Record<string, unknown>)
  const closeProps = $derived(api.getCloseTriggerProps() as Record<string, unknown>)
</script>

{#if trigger}
  {@render trigger({ props: triggerProps })}
{/if}

{#if api.open}
  <Portal>
    <div {...api.getBackdropProps()}></div>
    <div
      {...api.getPositionerProps()}
      data-presentation={presentation}
      data-flush={flush ? '' : undefined}
    >
      <div {...api.getContentProps()}>
        <h2 {...api.getTitleProps()} data-hidden={titleHidden ? '' : undefined}>{title}</h2>
        {#if description}
          <p {...api.getDescriptionProps()}>{description}</p>
        {/if}
        {@render children({ closeProps })}
      </div>
    </div>
  </Portal>
{/if}

<style>
  [data-part='backdrop'] {
    position: fixed;
    inset: 0;
    z-index: var(--layer-backdrop);
    background: rgb(0 0 0 / 0.5);
  }

  [data-part='positioner'] {
    position: fixed;
    inset: 0;
    z-index: var(--layer-dialog);
    display: flex;
  }

  [data-part='content'] {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    padding: var(--dialog-content-padding, var(--space-m));
    overflow-y: auto;
    background: var(--background-l1);
    border: 2px solid var(--border);
  }

  [data-part='title'] {
    font-size: var(--step-1);

    &[data-hidden] {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  }

  [data-part='description'] {
    font-size: var(--step--1);
    color: var(--foreground-l3);
  }

  [data-presentation='center'] {
    align-items: center;
    justify-content: center;
    padding: var(--space-m);

    [data-part='content'] {
      inline-size: 100%;
      max-inline-size: 28rem;
      max-block-size: 100%;
      border-radius: var(--radius-lg);
    }
  }

  /* Full-bleed: the close trigger must land exactly where the header trigger
     sits, which only holds when the sheet spans the whole viewport. */
  [data-presentation='sheet'] {
    justify-content: flex-start;

    [data-part='content'] {
      block-size: 100%;
      inline-size: 100%;
      border: none;
    }
  }

  [data-flush] [data-part='content'] {
    gap: 0;
    block-size: 100%;
    padding: 0;
  }

  [data-presentation='drawer'] {
    align-items: flex-end;

    [data-part='content'] {
      inline-size: 100%;
      max-block-size: var(--dialog-drawer-max-size, 85dvh);
      border-inline: none;
      border-block-end: none;
    }
  }
</style>

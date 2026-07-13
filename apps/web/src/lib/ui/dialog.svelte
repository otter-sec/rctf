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
  const service = useMachine(dialog.machine, () => ({
    id,
    open,
    onOpenChange(details: { open: boolean }) {
      if (onOpenChange) {
        onOpenChange(details.open)
      } else {
        open = details.open
      }
    },
  }))
  const api = $derived(dialog.connect(service, normalizeProps))

  const triggerProps = $derived(
    api.getTriggerProps() as Record<string, unknown>
  )
  const closeProps = $derived(
    api.getCloseTriggerProps() as Record<string, unknown>
  )
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
        <h2 {...api.getTitleProps()} data-hidden={titleHidden ? '' : undefined}>
          {title}
        </h2>
        <dialog-body>
          {#if description}
            <p {...api.getDescriptionProps()}>{description}</p>
          {/if}
          {@render children({ closeProps })}
        </dialog-body>
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
    overflow: clip;
    background: var(--dialog-content-background, var(--background-l1));
    border: 2px solid var(--border);
  }

  [data-part='title'] {
    flex-shrink: 0;
    padding: 0.375rem 1rem;
    color: var(--foreground-l3);
    background: var(--background-l3);

    &[data-hidden] {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  }

  dialog-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-xs);
    min-block-size: 0;
    padding: var(--dialog-content-padding, 0.75rem 1rem);
    overflow-y: auto;
    overscroll-behavior: none;
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
      max-inline-size: var(--dialog-max-inline-size, 28rem);
      max-block-size: var(--dialog-max-block-size, 100%);
      border-radius: var(--radius-lg);
    }
  }

  [data-presentation='sheet'] {
    justify-content: flex-start;

    [data-part='content'] {
      block-size: 100%;
      inline-size: 100%;
      border: none;
    }
  }

  [data-flush] [data-part='content'] {
    block-size: var(--dialog-block-size, 100%);

    dialog-body {
      gap: 0;
      padding: 0;
    }
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

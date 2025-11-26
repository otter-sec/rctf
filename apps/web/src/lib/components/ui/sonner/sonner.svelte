<script lang="ts">
  import IconAlertCircleFilled from '~icons/tabler/alert-circle-filled'
  import IconAlertTriangleFilled from '~icons/tabler/alert-triangle-filled'
  import IconCircleCheckFilled from '~icons/tabler/circle-check-filled'
  import IconInfoCircleFilled from '~icons/tabler/info-circle-filled'
  import IconLoader from '~icons/tabler/loader'
  import { browser } from '$app/environment'
  import {
    Toaster as Sonner,
    type ToasterProps as SonnerProps,
  } from 'svelte-sonner'

  let { ...restProps }: SonnerProps = $props()

  let theme = $state<'light' | 'dark'>('light')

  $effect(() => {
    if (!browser) return

    const getTheme = () => {
      const dataTheme = document.documentElement.getAttribute('data-theme')
      return dataTheme === 'dark' ? 'dark' : 'light'
    }

    theme = getTheme()

    const observer = new MutationObserver(() => {
      theme = getTheme()
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    return () => observer.disconnect()
  })
</script>

<Sonner
  {theme}
  position="top-center"
  class="toaster group"
  toastOptions={{
    unstyled: true,
    classes: {
      toast:
        'font-sans flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-background-l0 w-full',
      default: 'text-foreground-l0',
      success: 'text-foreground-success',
      error: 'text-foreground-destructive',
      warning: 'text-foreground-yellow-l1',
      info: 'text-foreground-blue-l1',
      title: 'text-sm font-medium',
      description: 'text-sm opacity-80',
      actionButton:
        'bg-foreground-l0 text-background-l0 px-3 py-1.5 rounded-md text-xs font-medium hover:opacity-90',
      cancelButton:
        'bg-background-l3 text-foreground-l1 px-3 py-1.5 rounded-md text-xs font-medium hover:bg-background-l4',
    },
  }}
  {...restProps}
>
  {#snippet loadingIcon()}
    <IconLoader class="size-5 animate-spin" />
  {/snippet}
  {#snippet successIcon()}
    <IconCircleCheckFilled class="size-5" />
  {/snippet}
  {#snippet errorIcon()}
    <IconAlertCircleFilled class="size-5" />
  {/snippet}
  {#snippet warningIcon()}
    <IconAlertTriangleFilled class="size-5" />
  {/snippet}
  {#snippet infoIcon()}
    <IconInfoCircleFilled class="size-5" />
  {/snippet}
</Sonner>

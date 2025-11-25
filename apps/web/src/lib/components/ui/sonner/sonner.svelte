<script lang="ts">
  import { browser } from '$app/environment'
  import {
    Toaster as Sonner,
    type ToasterProps as SonnerProps,
  } from 'svelte-sonner'

  let { ...restProps }: SonnerProps = $props()

  // Get theme from data-theme attribute (synced with ThemeToggle)
  let theme = $state<'light' | 'dark'>('light')

  $effect(() => {
    if (!browser) return

    const getTheme = () => {
      const dataTheme = document.documentElement.getAttribute('data-theme')
      return dataTheme === 'dark' ? 'dark' : 'light'
    }

    theme = getTheme()

    // Watch for changes
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
  class="toaster group"
  style="--normal-bg: var(--background); --normal-text: var(--foreground); --normal-border: var(--border);"
  {...restProps}
/>

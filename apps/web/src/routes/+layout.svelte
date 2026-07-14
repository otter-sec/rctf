<script lang="ts">
  import '../styles/reset.css'
  import '../styles/fonts.css'
  import '../styles/color.css'
  import '../styles/typography.css'
  import '../styles/layout.css'
  import '../styles/shape.css'
  import '../styles/layers.css'
  import '../styles/prose.css'
  import '../styles/reveal.css'
  import '../styles/theme-visibility.css'
  import { QueryClientProvider } from '@tanstack/svelte-query'
  import favicon from '$lib/assets/favicon.svg'
  import Brainrot from '$lib/components/brainrot.svelte'
  import Navigation from '$lib/components/navigation.svelte'
  import RootEdgeFades from '$lib/components/root-edge-fades.svelte'
  import { resetSessionQueries } from '$lib/query/core'
  import ToastHost from '$lib/ui/toast-host.svelte'
  import { initAnalytics } from '$lib/utils/analytics'
  import { initFadeFallback } from '$lib/utils/fade-fallback'
  import { onMount } from 'svelte'
  import type { LayoutProps } from './$types'

  const { data, children }: LayoutProps = $props()

  onMount(() => {
    initAnalytics(data.clientConfig)
    const cleanupFadeFallback = initFadeFallback()
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'token') void resetSessionQueries(data.queryClient)
    }
    window.addEventListener('storage', handleStorage)
    return () => {
      cleanupFadeFallback?.()
      window.removeEventListener('storage', handleStorage)
    }
  })

  function onAnimationEnd(event: AnimationEvent) {
    if (event.animationName !== 'reveal-fade-in') return
    if (event.target instanceof HTMLElement)
      event.target.removeAttribute('data-reveal')
  }
</script>

<svelte:document onanimationend={onAnimationEnd} />

<svelte:head>
  <link rel="icon" href={data.clientConfig.faviconUrl ?? favicon} />
  <link rel="shortcut icon" href="/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta name="apple-mobile-web-app-title" content={data.clientConfig.ctfName} />
  <title>{data.clientConfig.ctfName}</title>

  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-capable" content="yes" />

  <meta name="description" content={data.clientConfig.meta.description} />

  <meta name="theme-color" content="#111111" />
  <link rel="canonical" href={data.clientConfig.origin} />

  <meta property="og:type" content="website" />
  <meta property="og:title" content={data.clientConfig.ctfName} />
  <meta
    property="og:description"
    content={data.clientConfig.meta.description}
  />
  <meta property="og:image" content={data.clientConfig.meta.imageUrl} />
  <meta property="og:url" content={data.clientConfig.origin} />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={data.clientConfig.ctfName} />
  <meta
    name="twitter:description"
    content={data.clientConfig.meta.description}
  />
  <meta name="twitter:image" content={data.clientConfig.meta.imageUrl} />
  <meta name="twitter:url" content={data.clientConfig.origin} />
</svelte:head>

<QueryClientProvider client={data.queryClient}>
  <app-shell>
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <Navigation />

    <main id="main-content" tabindex="-1">
      {@render children()}
    </main>

    <RootEdgeFades />
  </app-shell>
</QueryClientProvider>

<ToastHost />

<Brainrot />

<style>
  app-shell {
    display: flex;
    flex-direction: column;
    min-block-size: 100dvh;
    padding-block-start: var(--header-height);
  }

  main {
    display: flex;
    flex-direction: column;
    flex: 1;
    outline: none;
  }

  .skip-link {
    position: fixed;
    inset-block-start: var(--space-3xs);
    inset-inline-start: var(--space-3xs);
    z-index: var(--layer-toast);
    padding: var(--space-3xs) var(--space-2xs);
    color: var(--foreground-l0);
    background: var(--background-l1);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);

    &:not(:focus-visible) {
      clip-path: inset(50%);
      white-space: nowrap;
    }
  }
</style>

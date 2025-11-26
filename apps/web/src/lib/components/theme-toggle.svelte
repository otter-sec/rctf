<script lang="ts">
  import { Button } from '$lib/components'
  import { IconMoon, IconSun } from '$lib/icons'
  import { onMount } from 'svelte'

  let theme = $state<'light' | 'dark'>('light')

  onMount(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || stored === 'light') {
      theme = stored
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      theme = 'dark'
    }
    document.documentElement.setAttribute('data-theme', theme)
  })

  function toggle() {
    const newTheme = theme === 'dark' ? 'light' : 'dark'

    document.documentElement.classList.add('[&_*]:transition-none!')
    document.documentElement.setAttribute('data-theme', newTheme)
    document.documentElement.offsetHeight

    requestAnimationFrame(() => {
      document.documentElement.classList.remove('[&_*]:transition-none!')
    })

    localStorage.setItem('theme', newTheme)
    theme = newTheme
  }
</script>

<svelte:head>
  {@html `<script>
    (function() {
      const stored = localStorage?.getItem('theme') ?? '';
      const theme = ['dark', 'light'].includes(stored)
        ? stored
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('theme', theme);
    })();
  </script>`}
</svelte:head>

<Button
  variant="ghost"
  size="icon-sm"
  onclick={toggle}
  aria-label="Toggle theme"
>
  {#if theme === 'dark'}
    <IconSun class="size-4" />
  {:else}
    <IconMoon class="size-4" />
  {/if}
</Button>

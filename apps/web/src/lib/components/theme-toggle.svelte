<script lang="ts">
  import { Tooltip } from '$lib/components'
  import { IconMoonFilled, IconSunHighFilled } from '$lib/icons'
  import { onMount } from 'svelte'

  let theme = $state<'light' | 'dark'>('dark')

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

<Tooltip.Root disableCloseOnTriggerClick>
  <Tooltip.Trigger>
    <button
      onclick={toggle}
      aria-label="Toggle theme"
      class="bg-background-l2 hover:bg-background-l4 flex items-center justify-center rounded-lg px-4 py-3"
    >
      {#if theme === 'dark'}
        <IconSunHighFilled class="text-foreground-l4 size-6" />
      {:else}
        <IconMoonFilled class="text-foreground-l4 size-6" />
      {/if}
    </button>
  </Tooltip.Trigger>
  <Tooltip.Content sideOffset={8}>
    {theme === 'dark' ? 'Light mode' : 'Dark mode'}
  </Tooltip.Content>
</Tooltip.Root>

<script lang="ts">
  import IconMoonFilled from '$lib/icons/icon-moon-filled.svelte'
  import IconSunHighFilled from '$lib/icons/icon-sun-high-filled.svelte'

  function toggle() {
    const root = document.documentElement
    const dark =
      root.dataset.theme === 'dark' ||
      (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches)
    const theme = dark ? 'light' : 'dark'
    root.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }
</script>

<button type="button" onclick={toggle} aria-label="Toggle theme">
  <sun-icon><IconSunHighFilled /></sun-icon>
  <moon-icon><IconMoonFilled /></moon-icon>
</button>

<style>
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1rem;
    font-size: 1.5rem;
    color: var(--foreground-l2);
    background: var(--background-l2);
    border-radius: var(--radius-lg);
    cursor: pointer;

    &:hover {
      background: var(--background-l3);
    }
  }

  sun-icon,
  moon-icon {
    display: contents;
  }

  moon-icon {
    :global(:root[data-theme='dark']) & {
      display: none;
    }

    @media (prefers-color-scheme: dark) {
      :global(:root:not([data-theme])) & {
        display: none;
      }
    }
  }

  sun-icon {
    :global(:root[data-theme='light']) & {
      display: none;
    }

    @media (prefers-color-scheme: light) {
      :global(:root:not([data-theme])) & {
        display: none;
      }
    }
  }
</style>

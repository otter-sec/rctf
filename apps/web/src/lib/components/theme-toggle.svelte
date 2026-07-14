<script lang="ts">
  import { IconMoonStars, IconSun } from '$lib/icons'

  function toggle() {
    const root = document.documentElement
    const dark =
      root.dataset.theme === 'dark' ||
      (!root.dataset.theme &&
        matchMedia('(prefers-color-scheme: dark)').matches)
    const theme = dark ? 'light' : 'dark'
    root.dataset.theme = theme
    localStorage.setItem('theme', theme)
  }
</script>

<button type="button" onclick={toggle} aria-label="Toggle theme">
  <sun-icon data-theme-visible="dark"><IconSun /></sun-icon>
  <moon-icon data-theme-visible="light"><IconMoonStars /></moon-icon>
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
</style>

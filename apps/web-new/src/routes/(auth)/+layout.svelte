<script lang="ts">
  import type { LayoutProps } from './$types'

  const { children }: LayoutProps = $props()
</script>

<auth-layout>
  <auth-container>
    {@render children()}
  </auth-container>
</auth-layout>

<style>
  auth-layout {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: var(--space-s);
  }

  auth-container {
    display: block;
    inline-size: 100%;
    max-inline-size: 28rem;
  }
</style>

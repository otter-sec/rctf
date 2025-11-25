<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    title,
    description,
    children,
  }: {
    title?: string
    description?: string
    children?: Snippet
  } = $props()
</script>

<section class="flex flex-col gap-3 border p-4">
  {#if title}
    <header class="flex flex-col gap-1">
      <h2>{title}</h2>
      {#if description}
        <p>{description}</p>
      {/if}
    </header>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</section>

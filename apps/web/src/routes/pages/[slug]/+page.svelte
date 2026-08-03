<script lang="ts">
  import Markdown from '$lib/components/markdown.svelte'
  import Card from '$lib/ui/card.svelte'
  import type { PageProps } from './$types'

  const { data }: PageProps = $props()
</script>

<svelte:head>
  <title>{data.customPage.title} · {data.clientConfig.ctfName}</title>
</svelte:head>

<custom-page>
  <Card title={data.customPage.title}>
    <Markdown content={data.customPage.content} />
  </Card>
</custom-page>

<style>
  custom-page {
    display: block;
    inline-size: 100%;
    max-inline-size: calc(var(--measure) + 4.5rem);
    margin-inline: auto;
    padding: var(--space-s) 2.25rem;
  }
</style>

<script lang="ts">
  import { Card } from '$lib/components'
  import { marked } from 'marked'

  let { data } = $props()
</script>

<Card.Root>
  <Card.Header>
    <Card.Title class="text-2xl">Overview</Card.Title>
  </Card.Header>
  <Card.Content>
    <div class="prose prose-sm dark:prose-invert max-w-none">
      {@html marked(data.clientConfig.homeContent)}
    </div>
  </Card.Content>
</Card.Root>

{#if data.clientConfig.sponsors.length > 0}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-2xl">Sponsors</Card.Title>
    </Card.Header>
    <Card.Content>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
        {#each data.clientConfig.sponsors as sponsor (sponsor.name)}
          <article class="flex flex-col gap-2 rounded-md border p-4">
            <h3 class="font-medium">{sponsor.name}</h3>
            <div class="prose prose-sm dark:prose-invert max-w-none">
              {@html marked(sponsor.description)}
            </div>
          </article>
        {/each}
      </div>
    </Card.Content>
  </Card.Root>
{/if}

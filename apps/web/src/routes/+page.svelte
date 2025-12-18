<script lang="ts">
  import { Card } from '$lib/components'
  import { parseMarkdown } from '$lib/utils'

  let { data } = $props()
</script>

<div class="flex flex-col gap-4">
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">Overview</Card.Title>
    </Card.Header>
    <Card.Content>
      <div class="prose max-w-none">
        {@html parseMarkdown(data.clientConfig.homeContent)}
      </div>
    </Card.Content>
  </Card.Root>

  {#if data.clientConfig.sponsors.length > 0}
    <Card.Root>
      <Card.Header>
        <Card.Title class="text-xl">Sponsors</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          {#each data.clientConfig.sponsors as sponsor (sponsor.name)}
            <article class="bg-background-l2 flex flex-col gap-6 rounded-md p-4">
              <img src={sponsor.icon} alt={sponsor.name} class="h-auto w-full p-2 dark:invert" />
              <div class="flex flex-col gap-1">
                <h3 class="font-medium">{sponsor.name}</h3>
                <div class="prose max-w-none">
                  {@html parseMarkdown(sponsor.description)}
                </div>
              </div>
            </article>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>

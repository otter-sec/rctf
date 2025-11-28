<script lang="ts">
  import { Card } from '$lib/components'
  import { marked } from 'marked'

  let { data } = $props()
</script>

<div class="flex flex-col gap-4">
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">Overview</Card.Title>
    </Card.Header>
    <Card.Content>
      <div class="prose max-w-none">
        {@html marked(data.clientConfig.homeContent)}
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
            <article class="flex flex-col gap-6 rounded-md bg-background-l2 p-4">
              <img
                src={sponsor.icon}
                alt={sponsor.name}
                class="w-full h-auto dark:invert p-2"
              />
              <div class="flex flex-col gap-1">
                <h3 class="font-medium">{sponsor.name}</h3>
                <div class="prose max-w-none">
                  {@html marked(sponsor.description)}
                </div>
              </div>
            </article>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>

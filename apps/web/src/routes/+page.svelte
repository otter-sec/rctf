<script lang="ts">
  import { Card, Markdown } from '$lib/components'
  import { parseMarkdown } from '$lib/utils'

  let { data } = $props()
</script>

<div class="flex flex-col gap-4">
  <Card.Root>
    <Card.Content>
      <Markdown content={data.clientConfig.homeContent} class="max-w-none" />
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
            {@const content = {
              icon: sponsor.icon,
              name: sponsor.name,
              description: sponsor.description,
            }}
            {#if sponsor.url}
              <a
                href={sponsor.url}
                target="_blank"
                rel="noopener noreferrer"
                class="bg-background-l2 hover:bg-background-l3 flex flex-col gap-6 rounded-md p-4 transition-colors"
              >
                {#if content.icon}
                  <img
                    src={content.icon}
                    alt={content.name}
                    class="h-auto w-full p-2 dark:invert"
                  />
                {/if}
                <div class="flex flex-col gap-1">
                  <h3 class="font-medium">{content.name}</h3>
                  <div class="prose max-w-none">
                    {@html parseMarkdown(content.description)}
                  </div>
                </div>
              </a>
            {:else}
              <article class="bg-background-l2 flex flex-col gap-6 rounded-md p-4">
                {#if content.icon}
                  <img
                    src={content.icon}
                    alt={content.name}
                    class="h-auto w-full p-2 dark:invert"
                  />
                {/if}
                <div class="flex flex-col gap-1">
                  <h3 class="font-medium">{content.name}</h3>
                  <div class="prose max-w-none">
                    {@html parseMarkdown(content.description)}
                  </div>
                </div>
              </article>
            {/if}
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  <div class="text-foreground-l5 py-4 text-center text-sm">
    Powered by <a
      href="https://rctf.osec.io"
      target="_blank"
      class="text-foreground-l5 hover:text-foreground-l3 underline underline-offset-3">rCTF</a
    >
  </div>
</div>

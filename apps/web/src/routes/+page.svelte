<script lang="ts">
  import { Section } from '$lib'
  import { marked } from 'marked'

  let { data } = $props()
</script>

<Section title="Overview">
  <div>
    {@html marked(data.clientConfig.homeContent)}
  </div>
</Section>

{#if data.clientConfig.sponsors.length > 0}
  <Section title="Sponsors">
    <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
      {#each data.clientConfig.sponsors as sponsor (sponsor.name)}
        <article>
          <p><strong>{sponsor.name}</strong></p>
          <p>{sponsor.description}</p>
        </article>
      {/each}
    </div>
  </Section>
{/if}

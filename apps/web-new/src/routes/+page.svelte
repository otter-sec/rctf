<script lang="ts">
  import Markdown from '$lib/components/markdown.svelte'
  import Card from '$lib/ui/card.svelte'
  import type { PageProps } from './$types'

  const { data }: PageProps = $props()
</script>

<home-page>
  <Card>
    <Markdown content={data.clientConfig.homeContent} />
  </Card>

  {#if data.clientConfig.sponsors.length > 0}
    <Card title="Sponsors">
      <sponsor-grid>
        {#each data.clientConfig.sponsors as sponsor (sponsor.name)}
          <svelte:element
            this={sponsor.url ? 'a' : 'article'}
            href={sponsor.url}
            target={sponsor.url ? '_blank' : undefined}
            rel={sponsor.url ? 'noopener noreferrer' : undefined}
          >
            {#if sponsor.icon}
              <img src={sponsor.icon} alt={sponsor.name} />
            {/if}
            <h3>{sponsor.name}</h3>
            <Markdown content={sponsor.description} />
          </svelte:element>
        {/each}
      </sponsor-grid>
    </Card>
  {/if}

  <footer>
    Powered by
    <a href="https://rctf.osec.io" target="_blank" rel="noopener noreferrer">rCTF</a>
  </footer>
</home-page>

<style>
  home-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    inline-size: 100%;
    max-inline-size: var(--page-max-width);
    margin-inline: auto;
  }

  sponsor-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-s);

    a,
    article {
      display: flex;
      flex-direction: column;
      gap: var(--space-xs);
      padding: var(--space-s);
      border-radius: var(--radius-md);
      background: var(--background-l2);
    }

    a:hover {
      background: var(--background-l3);
    }

    img {
      inline-size: 100%;
      block-size: auto;
      padding: var(--space-2xs);

      :global(:root[data-theme='dark']) & {
        filter: invert(1);
      }

      @media (prefers-color-scheme: dark) {
        :global(:root:not([data-theme])) & {
          filter: invert(1);
        }
      }
    }

    h3 {
      font-weight: var(--font-weight-medium);
    }

    @media (width >= 48rem) {
      grid-template-columns: 1fr 1fr;
    }
  }

  footer {
    padding-block: var(--space-s);
    text-align: center;
    font-size: var(--step--1);
    color: var(--foreground-l4);

    a {
      --underline: currentColor;
    }
  }
</style>

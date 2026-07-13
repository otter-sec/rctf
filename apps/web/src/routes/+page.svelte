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
          {@const iconLight = sponsor.iconLight || sponsor.iconDark}
          {@const iconDark = sponsor.iconDark || sponsor.iconLight}
          <svelte:element
            this={sponsor.url ? 'a' : 'article'}
            href={sponsor.url}
            target={sponsor.url ? '_blank' : undefined}
            rel={sponsor.url ? 'noopener noreferrer' : undefined}
          >
            {#if iconLight}
              <sponsor-icon-light>
                <img src={iconLight} alt={sponsor.name} />
              </sponsor-icon-light>
              <sponsor-icon-dark>
                <img src={iconDark} alt={sponsor.name} />
              </sponsor-icon-dark>
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
    <a href="https://rctf.osec.io" target="_blank" rel="noopener noreferrer"
      >rCTF</a
    >
  </footer>
</home-page>

<style>
  home-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    inline-size: 100%;
    max-inline-size: calc(var(--measure) + 2rem);
    margin-inline: auto;
    padding-inline: 1rem;

    @media (width >= 48rem) {
      max-inline-size: calc(var(--measure) + 4.5rem);
      padding-inline: 2.25rem;
    }
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

    a {
      text-decoration: none;
    }

    a:hover {
      background: var(--background-l3);
    }

    sponsor-icon-light,
    sponsor-icon-dark {
      display: contents;
    }

    sponsor-icon-light {
      :global(:root[data-theme='dark']) & {
        display: none;
      }

      @media (prefers-color-scheme: dark) {
        :global(:root:not([data-theme])) & {
          display: none;
        }
      }
    }

    sponsor-icon-dark {
      :global(:root[data-theme='light']) & {
        display: none;
      }

      @media (prefers-color-scheme: light) {
        :global(:root:not([data-theme])) & {
          display: none;
        }
      }
    }

    img {
      inline-size: 100%;
      block-size: auto;
      max-block-size: 8rem;
      object-fit: contain;
      padding: var(--space-2xs);
    }

    h3 {
      font-size: var(--step-1);
      font-weight: var(--font-weight-medium);
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

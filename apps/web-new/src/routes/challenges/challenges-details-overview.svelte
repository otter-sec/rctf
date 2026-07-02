<!--
  Details tab body: the markdown description, an optional files box (with
  serialized "Download all" for multi-file challenges), and the instancer /
  admin-bot boxes when the challenge configures them. Files/instancer/admin-bot
  share a container-query grid that collapses to one column on narrow panes.
-->
<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import Markdown from '$lib/components/markdown.svelte'
  import IconDownload from '$lib/icons/icon-download.svelte'
  import IconFileFilled from '$lib/icons/icon-file-filled.svelte'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import Section from '$lib/ui/section.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { downloadAll } from '$lib/utils/download'
  import { formatFileSize } from '$lib/utils/filesize'
  import { onDestroy } from 'svelte'

  interface Props {
    challenge: Challenge
  }

  let { challenge }: Props = $props()

  let downloading = $state(false)
  let cancelDownload: (() => void) | null = null

  function handleDownloadAll() {
    downloading = true
    cancelDownload = downloadAll(challenge.files, {
      onDone: () => (downloading = false),
      onError: name => toast.error(`Couldn't start the download for ${name}`),
    })
  }

  onDestroy(() => cancelDownload?.())
</script>

<overview-content>
  <Section title="Description">
    <Markdown content={challenge.description} />
  </Section>

  <overview-grid>
    {#if challenge.files.length > 0}
      <Section title="Files">
        <files-box>
          <file-list>
            {#each challenge.files as file (file.url)}
              <a href={file.url} target="_blank" rel="noopener noreferrer">
                <IconFileFilled data-slot="icon" />
                <file-meta>
                  <span data-slot="name">{file.name}</span>
                  <span data-slot="size">{formatFileSize(file.size)}</span>
                </file-meta>
              </a>
            {/each}
          </file-list>
          {#if challenge.files.length > 1}
            <Button onclick={handleDownloadAll} disabled={downloading}>
              {#if downloading}
                <Spinner />
                Downloading…
              {:else}
                <IconDownload />
                Download all
              {/if}
            </Button>
          {/if}
        </files-box>
      </Section>
    {/if}

    {#if challenge.instancerLifetime != null}
      <!-- U13: replace with the instancer panel (challengeId + instancer config props). -->
      <Section title="Instancer">
        <instancer-slot>Instancer controls load here.</instancer-slot>
      </Section>
    {/if}

    {#if challenge.adminBotInputs != null}
      <!-- U14: replace with the admin-bot panel (challengeId + adminBotInputs props). -->
      <Section title="Admin bot">
        <admin-bot-slot>Admin-bot form loads here.</admin-bot-slot>
      </Section>
    {/if}
  </overview-grid>
</overview-content>

<style>
  overview-content {
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    padding: var(--space-s) var(--space-l) var(--space-l);
  }

  overview-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-s);
  }

  /* A box left alone on its own row stretches to the full width. */
  overview-grid > :global(:last-child:nth-child(odd)) {
    grid-column: 1 / -1;
  }

  @container (min-inline-size: 36rem) {
    overview-grid {
      grid-template-columns: 1fr 1fr;
    }
  }

  files-box {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  file-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    max-block-size: 12rem;
    overflow-y: auto;
  }

  file-list a {
    display: flex;
    align-items: center;
    gap: var(--space-s);
    padding: var(--space-2xs) var(--space-s);
    color: inherit;
    text-decoration: none;
    background: var(--background-l3);
    border-radius: var(--radius-md);

    &:hover {
      background: var(--background-l4);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }
  }

  file-list :global([data-slot='icon']) {
    flex-shrink: 0;
    font-size: 1.25rem;
    color: var(--foreground-l3);
  }

  file-meta {
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
  }

  file-meta [data-slot='name'] {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  file-meta [data-slot='size'] {
    color: var(--foreground-l3);
    font-size: var(--step--1);
  }

  instancer-slot,
  admin-bot-slot {
    display: block;
    color: var(--foreground-l4);
    font-size: var(--step--1);
  }
</style>

<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import Markdown from '$lib/components/markdown.svelte'
  import { IconDownload, IconFiles } from '$lib/icons'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import Section from '$lib/ui/section.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { downloadAll } from '$lib/utils/download'
  import { formatFileSize } from '$lib/utils/filesize'
  import { onDestroy } from 'svelte'
  import ChallengeDetailsOverviewAdminbot from './overview-adminbot.svelte'
  import ChallengeDetailsOverviewInstancer from './overview-instancer.svelte'

  interface Props {
    challenge: Challenge
    onSolve: (challengeId: string) => void
  }

  let { challenge, onSolve }: Props = $props()

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
          <file-list tabindex="-1">
            {#each challenge.files as file (file.url)}
              <a href={file.url} target="_blank" rel="noopener noreferrer">
                <IconFiles data-slot="icon" />
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
      <Section title="Instancer">
        <ChallengeDetailsOverviewInstancer
          challengeId={challenge.id}
          instancerLifetime={challenge.instancerLifetime}
          instancerExtendable={challenge.instancerExtendable}
          instancerStoppable={challenge.instancerStoppable}
          instancerActions={challenge.instancerActions}
          {onSolve}
        />
      </Section>
    {/if}

    {#if challenge.adminBotInputs != null}
      <Section title="Admin bot">
        <ChallengeDetailsOverviewAdminbot
          challengeId={challenge.id}
          inputs={challenge.adminBotInputs}
        />
      </Section>
    {/if}
  </overview-grid>
</overview-content>

<style>
  overview-content {
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem 1.25rem;
  }

  overview-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem;

    @container (min-inline-size: 36rem) {
      grid-template-columns: 1fr 1fr;
    }

    > :global(:last-child:nth-child(odd)) {
      grid-column: 1 / -1;
    }
  }

  files-box {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
  }

  file-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    max-block-size: 12rem;
    overflow-y: auto;
    overscroll-behavior: none;

    a {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0.75rem;
      color: inherit;
      text-decoration: none;
      background: var(--background-l4);
      border-radius: var(--radius-md);

      &:hover {
        background: var(--background-l5);
      }

      &:focus-visible {
        outline: 2px solid var(--ring);
        outline-offset: 0;
      }
    }

    :global([data-slot='icon']) {
      flex-shrink: 0;
      font-size: 1.25rem;
      color: var(--foreground-l3);
    }
  }

  file-meta {
    display: flex;
    flex-direction: column;
    min-inline-size: 0;

    [data-slot='name'] {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    [data-slot='size'] {
      color: var(--foreground-l3);
      font-size: var(--step--1);
    }
  }
</style>

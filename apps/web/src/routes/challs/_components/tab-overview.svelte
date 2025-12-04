<script lang="ts">
  import type { Challenge } from '$lib/api'
  import { Markdown, ScrollArea } from '$lib/components'
  import { IconDownload, IconFileFilled } from '$lib/icons'
  import { formatFileSize } from '$lib/utils'
  import InstancerPanel from './instancer-panel.svelte'

  interface Props {
    challenge: Challenge
  }

  let { challenge }: Props = $props()
</script>

<ScrollArea class="h-full px-5 pt-4" fadeSize={64} fadeColor="background-l2">
  <div class="flex flex-col gap-4">
    <div class="overflow-hidden rounded-lg border-2">
      <div class="bg-background-l3 px-4 py-1.5 text-base text-foreground-l3">Description</div>
      <div class="px-4 pt-2 pb-4">
        <Markdown content={challenge.description} class="prose-sm max-w-none" />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-4">
      {#if challenge.files.length > 0}
        <div class="flex flex-col overflow-hidden rounded-lg border-2">
          <div class="bg-background-l3 px-4 py-1.5 text-base text-foreground-l3">Files</div>
          <div class="relative flex flex-1 flex-col">
            <ScrollArea class="max-h-48">
              <div class="flex flex-col gap-1 p-2">
                {#each challenge.files as file}
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex items-center gap-3 rounded-md bg-background-l4 px-3 py-2 hover:bg-background-l5">
                    <IconFileFilled class="size-5 shrink-0 text-foreground-l3" />
                    <div class="flex min-w-0 flex-col">
                      <span class="text-base text-foreground-l0">{file.name}</span>
                      <span class="text-sm text-foreground-l3">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  </a>
                {/each}
              </div>
            </ScrollArea>
            {#if challenge.files.length > 1}
              <div class="p-2">
                <button
                  class="flex w-full items-center justify-center gap-1 rounded-md bg-background-accent px-4 py-2 text-base font-normal text-foreground-accent hover:opacity-90">
                  <IconDownload class="size-5" />
                  Download all
                </button>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      {#if challenge.instancer}
        <div class="flex flex-col overflow-hidden rounded-lg border-2">
          <div class="bg-background-l3 px-4 py-1.5 text-base text-foreground-l3">Instancer</div>
          <InstancerPanel challengeId={challenge.id} />
        </div>
      {/if}
    </div>
  </div>
</ScrollArea>

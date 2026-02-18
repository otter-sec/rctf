<script lang="ts">
  import type { Challenge } from '@rctf/types'
  import { Markdown, ScrollArea } from '$lib/components'
  import { IconDownload, IconFileFilled } from '$lib/icons'
  import { formatFileSize } from '$lib/utils'
  import ChallengeDetailsAdminbot from './challenge-details-adminbot.svelte'
  import ChallengeDetailsInstancer from './challenge-details-instancer.svelte'

  interface Props {
    challenge: Challenge
  }

  let { challenge }: Props = $props()
</script>

<ScrollArea class="h-full px-5 pt-4" fadeSize={64} fadeColor="background-l2">
  <div class="flex flex-col gap-4">
    <div class="overflow-hidden rounded-lg border-2">
      <div class="bg-background-l3 text-foreground-l3 px-4 py-1.5 text-base">Description</div>
      <div class="px-4 pt-2 pb-4">
        <Markdown content={challenge.description} class="prose-sm max-w-none" />
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 @xl/details:grid-cols-2">
      {#if challenge.files.length > 0}
        <div class="flex flex-col overflow-hidden rounded-lg border-2">
          <div class="bg-background-l3 text-foreground-l3 px-4 py-1.5 text-base">Files</div>
          <div class="relative flex flex-1 flex-col">
            <ScrollArea class="max-h-48">
              <div class="flex flex-col gap-1 p-2">
                {#each challenge.files as file}
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="bg-background-l4 hover:bg-background-l5 flex items-center gap-3 rounded-md px-3 py-2"
                  >
                    <IconFileFilled class="text-foreground-l3 size-5 shrink-0" />
                    <div class="flex min-w-0 flex-col">
                      <span class="text-foreground-l0 text-base">{file.name}</span>
                      <span class="text-foreground-l3 text-sm">
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
                  class="bg-background-accent text-foreground-accent flex w-full items-center justify-center gap-1 rounded-md px-4 py-2 text-base font-normal hover:opacity-90"
                >
                  <IconDownload class="size-5" />
                  Download all
                </button>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      {#if challenge.instancerLifetime}
        <div class="flex flex-col overflow-hidden rounded-lg border-2">
          <div class="bg-background-l3 text-foreground-l3 px-4 py-1.5 text-base">Instancer</div>
          <ChallengeDetailsInstancer
            challengeId={challenge.id}
            instanceLifetime={challenge.instancerLifetime}
          />
        </div>
      {/if}

      {#if challenge.adminBotInputs}
        <div class="flex flex-col overflow-hidden rounded-lg border-2">
          <div class="bg-background-l3 text-foreground-l3 px-4 py-1.5 text-base">Admin bot</div>
          <ChallengeDetailsAdminbot challengeId={challenge.id} inputs={challenge.adminBotInputs} />
        </div>
      {/if}
    </div>
  </div>
</ScrollArea>

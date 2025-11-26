<script lang="ts">
  import IconDownload from '~icons/tabler/download'
  import type { Challenge } from '$lib/api'
  import { ScrollArea } from '$lib/components'
  import { marked } from 'marked'

  type Props = {
    challenge: Challenge
  }

  let { challenge }: Props = $props()
</script>

<ScrollArea class="h-full px-6 py-4">
  <div class="flex flex-col gap-6">
    <div class="prose prose-sm dark:prose-invert max-w-none">
      {@html marked(challenge.description)}
    </div>

    {#if challenge.files.length > 0}
      <div class="flex flex-col gap-2">
        <h3 class="text-sm font-medium">Files</h3>
        <div class="flex flex-wrap gap-2">
          {#each challenge.files as file}
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1.5 rounded-md border bg-background-l1 px-3 py-1.5 text-sm transition-colors hover:bg-background-l2"
            >
              <IconDownload class="size-4" />
              {file.name}
            </a>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</ScrollArea>

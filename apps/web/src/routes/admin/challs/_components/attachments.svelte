<script lang="ts">
  import { GoodFilesUploadV2 } from '@rctf/types'
  import { toast } from '$lib'
  import { Button, Spinner } from '$lib/components'
  import { IconFileUploadFilled, IconX } from '$lib/icons'
  import { useUploadFilesMutation } from '$lib/query'

  interface Props {
    files: { name: string; url: string; size: number | null }[]
    isDisabled: boolean
    onFilesChange: (
      files: { name: string; url: string; size: number | null }[]
    ) => void
  }

  let { files, isDisabled, onFilesChange }: Props = $props()

  const uploadMutation = useUploadFilesMutation()

  async function handleFileUpload(e: Event) {
    const input = e.target as HTMLInputElement
    if (!input.files?.length) return

    const filesToUpload = Array.from(input.files)

    $uploadMutation.mutate(
      { files: filesToUpload },
      {
        onSuccess: response => {
          if (response.kind === GoodFilesUploadV2.kind) {
            onFilesChange([...files, ...response.data])
            toast.success(`${response.data.length} file(s) uploaded!`)
          } else {
            toast.error(response.message)
          }
        },
        onError: error => {
          toast.error(error.message)
        },
      }
    )

    input.value = ''
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  function formatFileSize(bytes: number | null | undefined): string {
    if (bytes == null) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
</script>

<div
  class="overflow-hidden rounded-lg border-2 border-border bg-background-l2 flex flex-col"
>
  <div
    class="bg-background-l3 px-4 py-1.5 text-base text-foreground-l3 flex items-center justify-between"
  >
    <span>Attachments</span>
    <span class="text-base text-foreground-l5"
      >{files.length} file{files.length === 1 ? '' : 's'}</span
    >
  </div>
  <div class="p-4 flex flex-col gap-4 flex-1">
    {#if files.length > 0}
      <ul class="flex flex-col gap-2">
        {#each files as file, index (file.url)}
          <li
            class="flex items-center justify-between gap-2 rounded-md bg-background-l4 p-3"
          >
            <div class="flex flex-col gap-1 overflow-hidden">
              <div class="flex items-center gap-2">
                <span class="truncate font-medium">{file.name}</span>
                {#if file.size}
                  <span class="text-foreground-l5 text-xs shrink-0"
                    >{formatFileSize(file.size)}</span
                  >
                {/if}
              </div>
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                class="text-foreground-l3 truncate text-sm hover:underline"
              >
                {file.url}
              </a>
            </div>
            {#if !isDisabled}
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                onclick={() => removeFile(index)}
              >
                <IconX class="size-4" />
              </Button>
            {/if}
          </li>
        {/each}
      </ul>
    {:else}
      <p class="text-foreground-l3 text-sm">No files attached.</p>
    {/if}

    {#if !isDisabled}
      <div class="flex items-center gap-2 mt-auto">
        <input
          type="file"
          id="fileUpload"
          multiple
          onchange={handleFileUpload}
          disabled={$uploadMutation.isPending}
          class="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onclick={() => document.getElementById('fileUpload')?.click()}
          disabled={$uploadMutation.isPending}
        >
          {#if $uploadMutation.isPending}
            <Spinner class="size-4" />
          {:else}
            <IconFileUploadFilled class="size-4" />
          {/if}
          Upload files
        </Button>
      </div>
    {/if}
  </div>
</div>

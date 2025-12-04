<script lang="ts">
  import { GoodFilesUploadV2 } from '@rctf/types'
  import { toast } from '$lib'
  import { Button, Spinner } from '$lib/components'
  import { IconCloudUpload, IconFileFilled, IconTrashFilled } from '$lib/icons'
  import { useUploadFilesMutation } from '$lib/query'
  import { cn, formatFileSize } from '$lib/utils'

  interface Props {
    files: { name: string; url: string; size: number | null }[]
    isDisabled: boolean
    onFilesChange: (files: { name: string; url: string; size: number | null }[]) => void
  }

  let { files, isDisabled, onFilesChange }: Props = $props()

  const uploadMutation = useUploadFilesMutation()

  let isDragging = $state(false)
  let fileInput: HTMLInputElement | null = $state(null)

  function uploadFiles(fileList: FileList | File[]) {
    const filesToUpload = Array.from(fileList)
    if (!filesToUpload.length) return

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
  }

  function handleFileInput(e: Event) {
    const input = e.target as HTMLInputElement
    if (!input.files?.length) return
    uploadFiles(input.files)
    input.value = ''
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    isDragging = false
    if (isDisabled || !e.dataTransfer?.files.length) return
    uploadFiles(e.dataTransfer.files)
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    if (!isDisabled) isDragging = true
  }

  function handleDragLeave() {
    isDragging = false
  }

  function removeFile(index: number) {
    onFilesChange(files.filter((_, i) => i !== index))
  }
</script>

<div class="flex flex-col gap-4">
  {#if !isDisabled}
    <button
      type="button"
      class={cn(
        'relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8',
        isDragging
          ? 'border-primary bg-primary/5'
          : 'hover:border-foreground-l4 hover:bg-background-l3'
      )}
      onclick={() => fileInput?.click()}
      ondrop={handleDrop}
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      disabled={$uploadMutation.isPending}>
      {#if $uploadMutation.isPending}
        <Spinner class="size-8 text-foreground-l3" />
        <span class="text-sm text-foreground-l3">Uploading...</span>
      {:else}
        <IconCloudUpload class={cn('size-8', isDragging ? 'text-primary' : 'text-foreground-l4')} />
        <div class="flex flex-col items-center gap-0.5">
          <span class={cn('text-sm', isDragging ? 'text-primary' : 'text-foreground-l2')}>
            {isDragging ? 'Drop files here' : 'Click to upload or drag and drop'}
          </span>
          <span class="text-xs text-foreground-l4">Any file type supported</span>
        </div>
      {/if}
    </button>
    <input
      bind:this={fileInput}
      type="file"
      multiple
      onchange={handleFileInput}
      disabled={$uploadMutation.isPending}
      class="hidden" />
  {/if}

  {#if files.length > 0}
    <div class="flex flex-col gap-1">
      {#each files as file, index (file.url)}
        <div
          class="group flex items-center gap-3 rounded-lg bg-background-l3 px-3 py-2.5 hover:bg-background-l4">
          <IconFileFilled class="size-5 shrink-0 text-foreground-l4" />
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            class="flex min-w-0 flex-1 flex-col">
            <span class="truncate text-sm">{file.name}</span>
            <span class="text-xs text-foreground-l4">{formatFileSize(file.size)}</span>
          </a>
          {#if !isDisabled}
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              class="opacity-0 group-hover:opacity-100"
              onclick={() => removeFile(index)}>
              <IconTrashFilled class="size-4" />
            </Button>
          {/if}
        </div>
      {/each}
    </div>
  {:else if isDisabled}
    <div class="flex flex-col items-center justify-center py-8 text-foreground-l4">
      <IconFileFilled class="size-8 mb-2 opacity-50" />
      <span class="text-sm">No files attached</span>
    </div>
  {/if}
</div>

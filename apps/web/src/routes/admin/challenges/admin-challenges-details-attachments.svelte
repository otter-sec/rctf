<script lang="ts">
  import { GoodFilesUploadV2 } from '@rctf/types'
  import { showApiError, toast } from '$lib'
  import { Button, Spinner } from '$lib/components'
  import { IconCloudUpload, IconFileFilled, IconTrashFilled } from '$lib/icons'
  import { useUploadFilesMutation } from '$lib/query'
  import { cn, formatFileSize } from '$lib/utils'

  interface Props {
    files: { name: string; url: string; size: number | null }[]
    isDisabled: boolean
    onFilesChange: (files: Props['files']) => void
  }

  let { files, isDisabled, onFilesChange }: Props = $props()

  const upload = useUploadFilesMutation()
  let dragging = $state(false)
  let input: HTMLInputElement | null = $state(null)

  function handleUpload(list: FileList | File[]) {
    const items = Array.from(list)
    if (!items.length) return

    $upload.mutate(
      { files: items },
      {
        onSuccess: res => {
          if (res.kind === GoodFilesUploadV2.kind) {
            onFilesChange([...files, ...res.data])
            toast.success(`${res.data.length} file(s) uploaded!`)
          } else {
            showApiError(res)
          }
        },
        onError: e => toast.error(e.message),
      }
    )
  }

  function onInput(e: Event) {
    const el = e.target as HTMLInputElement
    if (el.files?.length) handleUpload(el.files)
    el.value = ''
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    dragging = false
    if (!isDisabled && e.dataTransfer?.files.length) handleUpload(e.dataTransfer.files)
  }
</script>

<div class="flex flex-col gap-4">
  {#if !isDisabled}
    <button
      type="button"
      class={cn(
        'relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8',
        dragging
          ? 'border-primary bg-primary/5'
          : 'hover:border-foreground-l4 hover:bg-background-l3'
      )}
      onclick={() => input?.click()}
      ondrop={onDrop}
      ondragover={e => (e.preventDefault(), !isDisabled && (dragging = true))}
      ondragleave={() => (dragging = false)}
      disabled={$upload.isPending}
    >
      {#if $upload.isPending}
        <Spinner class="text-foreground-l3 size-8" />
        <span class="text-foreground-l3 text-sm">Uploading...</span>
      {:else}
        <IconCloudUpload class={cn('size-8', dragging ? 'text-primary' : 'text-foreground-l4')} />
        <div class="flex flex-col items-center gap-0.5">
          <span class={cn('text-sm', dragging ? 'text-primary' : 'text-foreground-l2')}>
            {dragging ? 'Drop files here' : 'Click to upload or drag and drop'}
          </span>
          <span class="text-foreground-l4 text-xs">Any file type supported</span>
        </div>
      {/if}
    </button>
    <input
      bind:this={input}
      type="file"
      multiple
      onchange={onInput}
      disabled={$upload.isPending}
      class="hidden"
    />
  {/if}

  {#if files.length}
    <div class="flex flex-col gap-1">
      {#each files as file, i (file.url)}
        <div
          class="group bg-background-l3 hover:bg-background-l4 flex items-center gap-3 rounded-lg px-3 py-2.5"
        >
          <IconFileFilled class="text-foreground-l4 size-5 shrink-0" />
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            class="flex min-w-0 flex-1 flex-col"
          >
            <span class="truncate text-sm">{file.name}</span>
            <span class="text-foreground-l4 text-xs">{formatFileSize(file.size)}</span>
          </a>
          {#if !isDisabled}
            <Button
              variant="destructive"
              size="icon-sm"
              class="opacity-0 group-hover:opacity-100"
              onclick={() => onFilesChange(files.filter((_, j) => j !== i))}
            >
              <IconTrashFilled class="size-4" />
            </Button>
          {/if}
        </div>
      {/each}
    </div>
  {:else if isDisabled}
    <div class="text-foreground-l4 flex flex-col items-center justify-center py-8">
      <IconFileFilled class="mb-2 size-8 opacity-50" />
      <span class="text-sm">No files attached</span>
    </div>
  {/if}
</div>

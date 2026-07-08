<script lang="ts">
  import { GoodFilesUploadV2, UploadFilesRouteV2 } from '@rctf/types'
  import { apiRequest, showApiError } from '$lib/api'
  import { IconFiles, IconTrash } from '$lib/icons'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { formatFileSize } from '$lib/utils/filesize'
  import type { EditorForm } from '../model/editor-state'

  interface Props {
    files: EditorForm['files']
    disabled: boolean
    onFilesChange: (files: EditorForm['files']) => void
  }

  let { files, disabled, onFilesChange }: Props = $props()

  let uploading = $state(false)
  let dragging = $state(false)
  let fileInput = $state<HTMLInputElement | null>(null)

  async function upload(list: FileList | File[]) {
    const items = Array.from(list)
    if (items.length === 0) return

    uploading = true
    try {
      const response = await apiRequest(UploadFilesRouteV2, { files: items })
      if (response.kind === GoodFilesUploadV2.kind) {
        onFilesChange([...files, ...response.data])
        const count = response.data.length
        toast.success(`${count} file${count === 1 ? '' : 's'} uploaded!`)
      } else {
        showApiError(response)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload files')
    } finally {
      uploading = false
    }
  }

  function onPick(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    if (input.files?.length) upload(input.files)
    input.value = ''
  }

  function onDrop(event: DragEvent) {
    event.preventDefault()
    dragging = false
    if (!disabled && event.dataTransfer?.files.length) upload(event.dataTransfer.files)
  }

  function onDragOver(event: DragEvent) {
    event.preventDefault()
    if (!disabled) dragging = true
  }

  function removeAt(index: number) {
    onFilesChange(files.filter((_, i) => i !== index))
  }
</script>

<attachments-pane>
  {#if !disabled}
    <upload-zone
      role="button"
      tabindex="0"
      data-dragging={dragging || undefined}
      onclick={() => fileInput?.click()}
      onkeydown={(event: KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          fileInput?.click()
        }
      }}
      ondrop={onDrop}
      ondragover={onDragOver}
      ondragleave={() => (dragging = false)}
    >
      {#if uploading}
        <Spinner label="Uploading files" />
      {:else}
        <IconFiles />
        <zone-title>{dragging ? 'Drop files here' : 'Click to upload or drag and drop'}</zone-title>
        <zone-hint>Any file type supported</zone-hint>
      {/if}
    </upload-zone>
    <input bind:this={fileInput} type="file" multiple hidden onchange={onPick} />
  {/if}

  {#if files.length > 0}
    <file-list>
      {#each files as file, index (file.url)}
        <file-row>
          <IconFiles />
          <a href={file.url} target="_blank" rel="noopener noreferrer">
            <file-name>{file.name}</file-name>
            <file-size>{formatFileSize(file.size)}</file-size>
          </a>
          {#if !disabled}
            <Button
              variant="destructive"
              size="icon-sm"
              aria-label="Remove {file.name}"
              onclick={() => removeAt(index)}
            >
              <IconTrash />
            </Button>
          {/if}
        </file-row>
      {/each}
    </file-list>
  {:else if disabled}
    <EmptyState icon={IconFiles} title="No files attached" />
  {/if}
</attachments-pane>

<style>
  attachments-pane {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
  }

  upload-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3xs);
    padding: var(--space-xl);
    color: var(--foreground-l3);
    text-align: center;
    cursor: pointer;
    border: 2px dashed var(--border);
    border-radius: var(--radius-lg);

    &:hover,
    &:focus-visible {
      color: var(--foreground-l2);
      background: var(--background-l3);
      border-color: var(--foreground-l4);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
    }

    &[data-dragging] {
      color: var(--foreground-l1);
      background: var(--background-l3);
      border-color: var(--ring);
    }

    :global(svg) {
      inline-size: 2rem;
      block-size: 2rem;
      color: var(--foreground-l4);
    }
  }

  zone-title {
    font-size: var(--step--1);
  }

  zone-hint {
    font-size: var(--step--2);
    color: var(--foreground-l4);
  }

  file-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
  }

  file-row {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    padding: var(--space-2xs) var(--space-s);
    background: var(--background-l3);
    border-radius: var(--radius-md);

    &:hover {
      background: var(--background-l4);
    }

    &:not(:hover) :global(button:not(:focus-visible)) {
      opacity: 0;
    }

    > :global(svg) {
      flex-shrink: 0;
      inline-size: 1.25rem;
      block-size: 1.25rem;
      color: var(--foreground-l4);
    }
  }

  a {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-inline-size: 0;
    color: inherit;
    text-decoration: none;

    &:hover file-name {
      text-decoration: underline;
    }

    &:focus-visible {
      outline-offset: 0;
    }
  }

  file-name {
    overflow: hidden;
    font-size: var(--step--1);
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  file-size {
    font-size: var(--step--2);
    color: var(--foreground-l4);
  }
</style>

<script lang="ts">
  import { IconCloud, IconTrash } from '$lib/icons'
  import Button from '$lib/ui/button.svelte'
  import Input from '$lib/ui/input.svelte'

  interface Props {
    label: string
    url: string
    alt: string
    removeLabel: string
    mode: 'light' | 'dark'
    fallback?: string
    invertFallback?: boolean
    urlEditable?: boolean
    onUpload: (file: File) => Promise<void>
    onChange: (url: string) => void
  }

  const {
    label,
    url,
    alt,
    removeLabel,
    mode,
    fallback,
    invertFallback = false,
    urlEditable = false,
    onUpload,
    onChange,
  }: Props = $props()

  let input = $state<HTMLInputElement | null>(null)
  let uploading = $state(false)

  async function onFile(event: Event) {
    const target = event.currentTarget as HTMLInputElement
    const file = target.files?.[0]
    target.value = ''
    if (!file) {
      return
    }
    uploading = true
    try {
      await onUpload(file)
    } finally {
      uploading = false
    }
  }
</script>

<upload-row>
  <row-title>{label}</row-title>
  {#if urlEditable}
    <Input
      aria-label={`${label} URL`}
      value={url}
      placeholder="https://..."
      disabled={uploading}
      oninput={e => onChange(e.currentTarget.value)}
    />
  {/if}
  <upload-controls>
    <upload-preview data-mode={mode}>
      {#if url || fallback}
        <img
          src={url || fallback}
          {alt}
          data-invert={!url && invertFallback ? '' : undefined}
        />
      {:else}
        <preview-empty>No icon</preview-empty>
      {/if}
    </upload-preview>
    <upload-actions>
      <input
        bind:this={input}
        type="file"
        accept="image/*"
        hidden
        onchange={onFile}
      />
      <Button size="sm" onclick={() => input?.click()} disabled={uploading}>
        <IconCloud />
        {url ? 'Change' : 'Upload'}
      </Button>
      {#if url}
        <Button
          size="sm"
          variant="destructive"
          aria-label={removeLabel}
          onclick={() => onChange('')}
          disabled={uploading}
        >
          <IconTrash />
        </Button>
      {/if}
    </upload-actions>
  </upload-controls>
</upload-row>

<style>
  upload-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
  }

  row-title {
    display: block;
    color: var(--foreground-l3);
  }

  upload-controls {
    display: flex;
    align-items: center;
    gap: var(--space-s);
  }

  upload-preview {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    block-size: 4.5rem;
    padding-inline: var(--space-m);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);

    &[data-mode='light'] {
      background: oklch(98% 0 0);
    }

    &[data-mode='dark'] {
      background: oklch(15% 0 0);
    }

    img {
      max-block-size: 2.5rem;
      max-inline-size: 14rem;
    }

    img[data-invert] {
      filter: invert(1);
    }
  }

  preview-empty {
    font-size: var(--step--1);
    color: oklch(60% 0 0);
  }

  upload-actions {
    display: flex;
    flex-shrink: 0;
    gap: var(--space-2xs);
  }
</style>

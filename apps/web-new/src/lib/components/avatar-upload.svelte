<script lang="ts">
  import { validateAvatarFile } from '$lib/components/avatar-upload-logic'
  import IconCameraFilled from '$lib/icons/icon-camera-filled.svelte'
  import IconTrashFilled from '$lib/icons/icon-trash-filled.svelte'
  import { toast } from '$lib/toast'
  import Avatar from '$lib/ui/avatar.svelte'
  import Button from '$lib/ui/button.svelte'
  import Section from '$lib/ui/section.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { onDestroy, type Snippet } from 'svelte'

  type Props = {
    name: string
    avatarUrl: string | null
    loading: boolean
    header?: string
    onUpload: (file: File) => Promise<boolean>
    onRemove: () => Promise<boolean>
    children?: Snippet
  }

  let {
    name,
    avatarUrl,
    loading,
    header = 'Team avatar',
    onUpload,
    onRemove,
    children,
  }: Props = $props()

  let fileInput = $state<HTMLInputElement | null>(null)
  let previewUrl = $state<string | null>(null)
  let isRemoving = $state(false)

  const displayAvatarUrl = $derived(isRemoving ? null : (previewUrl ?? avatarUrl))

  function clearPreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      previewUrl = null
    }
  }

  onDestroy(clearPreview)

  async function handleFileSelect(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    isRemoving = false

    const validation = validateAvatarFile(file)
    if (!validation.ok) {
      toast.error(validation.message)
      input.value = ''
      return
    }

    clearPreview()
    previewUrl = URL.createObjectURL(file)
    const ok = await onUpload(file)
    if (!ok) clearPreview()
  }

  async function handleRemove() {
    isRemoving = true
    const ok = await onRemove()
    if (!ok) isRemoving = false
  }
</script>

<Section title={header}>
  <avatar-upload>
    <div class="preview">
      {#key displayAvatarUrl}
        <Avatar src={displayAvatarUrl} {name} />
      {/key}
      {#if loading}
        <div class="loading">
          <Spinner />
        </div>
      {/if}
    </div>

    <div class="actions">
      <input
        bind:this={fileInput}
        type="file"
        accept="image/*"
        hidden
        onchange={handleFileSelect}
      />
      <Button size="sm" onclick={() => fileInput?.click()} disabled={loading}>
        <IconCameraFilled />
        {avatarUrl ? 'Change' : 'Upload'}
      </Button>
      {#if avatarUrl}
        <Button variant="destructive" size="sm" onclick={handleRemove} disabled={loading}>
          <IconTrashFilled />
          Remove
        </Button>
      {/if}
    </div>
  </avatar-upload>

  {#if children}
    <upload-footnote>
      {@render children()}
    </upload-footnote>
  {/if}
</Section>

<style>
  avatar-upload {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-s);
  }

  .preview {
    position: relative;
    --avatar-size: 4.5rem;
    --avatar-radius: var(--radius-lg);
  }

  .loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    color: var(--foreground-l0);
    background: rgb(0 0 0 / 0.5);
    border-radius: var(--radius-lg);
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
  }

  upload-footnote {
    display: block;
    margin-block-start: var(--space-s);
  }
</style>

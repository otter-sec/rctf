<script lang="ts">
  import { Avatar, Button, Section, Spinner } from '$lib/components'
  import { IconCameraFilled, IconTrashFilled } from '$lib/icons'
  import { getInitials } from '$lib/utils'
  import { onDestroy, type Snippet } from 'svelte'
  import { toast } from 'svelte-sonner'

  interface Props {
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

  const MAX_AVATAR_SIZE = 1024 * 1024

  let fileInput = $state<HTMLInputElement | null>(null)
  let previewUrl = $state<string | null>(null)
  let isRemoving = $state(false)

  const displayAvatarUrl = $derived(isRemoving ? null : (previewUrl ?? avatarUrl))

  onDestroy(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
  })

  async function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) {
      return
    }

    isRemoving = false

    if (file.size > MAX_AVATAR_SIZE) {
      toast.error(`File too large. Maximum size is ${(MAX_AVATAR_SIZE / 1024 / 1024).toFixed(0)}MB`)
      input.value = ''
      return
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      input.value = ''
      return
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    previewUrl = URL.createObjectURL(file)
    const ok = await onUpload(file)
    if (!ok) {
      URL.revokeObjectURL(previewUrl)
      previewUrl = null
    }
  }

  async function handleRemove() {
    isRemoving = true
    const ok = await onRemove()
    if (!ok) {
      isRemoving = false
    }
  }

  function triggerFileInput() {
    fileInput?.click()
  }
</script>

<Section.Root>
  <Section.Header>{header}</Section.Header>
  <Section.Content>
    <div class="flex items-center justify-center gap-4">
      <div class="relative">
        {#key displayAvatarUrl}
          <Avatar.Root class="size-18 rounded-lg">
            {#if displayAvatarUrl}
              <Avatar.Image src={displayAvatarUrl} alt={name} class="rounded-lg" />
            {/if}
            <Avatar.Fallback class="rounded-lg text-xl">
              {getInitials(name)}
            </Avatar.Fallback>
          </Avatar.Root>
        {/key}
        {#if loading}
          <div class="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
            <Spinner class="size-5" />
          </div>
        {/if}
      </div>

      <div class="flex flex-col gap-2">
        <input
          bind:this={fileInput}
          type="file"
          accept="image/*"
          class="hidden"
          onchange={handleFileSelect}
        />
        <Button size="sm" onclick={triggerFileInput} disabled={loading}>
          <IconCameraFilled class="size-4" />
          {avatarUrl ? 'Change' : 'Upload'}
        </Button>
        {#if avatarUrl}
          <Button variant="destructive" size="sm" onclick={handleRemove} disabled={loading}>
            <IconTrashFilled class="size-4" />
            Remove
          </Button>
        {/if}
      </div>
    </div>

    {#if children}
      {@render children()}
    {/if}
  </Section.Content>
</Section.Root>

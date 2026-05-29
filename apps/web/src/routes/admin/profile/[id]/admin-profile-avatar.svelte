<script lang="ts">
  import { GoodAvatarUpdated } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { showApiError } from '$lib/api'
  import { Avatar, Button, Section, Spinner } from '$lib/components'
  import { IconCameraFilled, IconTrashFilled } from '$lib/icons'
  import { queryKeys, useUpdateAdminUserAvatarMutation } from '$lib/query'
  import { getInitials } from '$lib/utils'
  import { toast } from 'svelte-sonner'

  interface Props {
    id: string
    team: { name: string; avatarUrl: string | null }
  }

  let { id, team }: Props = $props()

  const MAX_AVATAR_SIZE = 1024 * 1024

  const queryClient = useQueryClient()
  const mutation = useUpdateAdminUserAvatarMutation()
  const loading = $derived(mutation.isPending)

  let fileInput = $state<HTMLInputElement | null>(null)
  let previewUrl = $state<string | null>(null)
  let isRemoving = $state(false)

  const displayAvatarUrl = $derived(isRemoving ? null : (previewUrl ?? team.avatarUrl))

  function refresh() {
    queryClient.invalidateQueries({ queryKey: queryKeys.adminUser(id) })
    queryClient.invalidateQueries({ queryKey: queryKeys.userById(id) })
  }

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

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

    previewUrl = URL.createObjectURL(file)
    upload(file)
  }

  function upload(file: File) {
    mutation.mutate(
      { id, avatar: file },
      {
        onSuccess: response => {
          if (response.kind === GoodAvatarUpdated.kind) {
            toast.success('Avatar updated!')
            refresh()
          } else {
            showApiError(response)
          }
          previewUrl = null
        },
        onError: error => {
          toast.error(error.message)
          previewUrl = null
        },
      }
    )
  }

  function remove() {
    isRemoving = true
    mutation.mutate(
      { id },
      {
        onSuccess: response => {
          if (response.kind === GoodAvatarUpdated.kind) {
            toast.success('Avatar removed!')
            refresh()
          } else {
            showApiError(response)
            isRemoving = false
          }
        },
        onError: error => {
          toast.error(error.message)
          isRemoving = false
        },
      }
    )
  }

  function triggerFileInput() {
    fileInput?.click()
  }
</script>

<Section.Root>
  <Section.Header>Team avatar</Section.Header>
  <Section.Content>
    <div class="flex items-center justify-center gap-4">
      <div class="relative">
        {#key displayAvatarUrl}
          <Avatar.Root class="size-18 rounded-lg">
            {#if displayAvatarUrl}
              <Avatar.Image src={displayAvatarUrl} alt={team.name} class="rounded-lg" />
            {/if}
            <Avatar.Fallback class="rounded-lg text-xl">
              {getInitials(team.name)}
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
          {team.avatarUrl ? 'Change' : 'Upload'}
        </Button>
        {#if team.avatarUrl}
          <Button variant="destructive" size="sm" onclick={remove} disabled={loading}>
            <IconTrashFilled class="size-4" />
            Remove
          </Button>
        {/if}
      </div>
    </div>
  </Section.Content>
</Section.Root>

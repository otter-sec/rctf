<script lang="ts">
  import { GoodAvatarUpdated, ProtectedAction } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { toast } from '$lib'
  import { Avatar, Button, Section, Spinner } from '$lib/components'
  import CaptchaNotice from '$lib/components/captcha-notice.svelte'
  import { IconCameraFilled, IconTrashFilled } from '$lib/icons'
  import { queryKeys, useClientConfig, useCurrentUser, useUpdateAvatarMutation } from '$lib/query'
  import { getInitials } from '$lib/utils'

  const MAX_AVATAR_SIZE = 1024 * 1024

  const queryClient = useQueryClient()
  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()
  const updateAvatarMutation = useUpdateAvatarMutation()

  const user = $derived($userQuery.data)
  const clientConfig = $derived($clientConfigQuery.data)
  const loading = $derived($updateAvatarMutation.isPending)

  let fileInput: HTMLInputElement | null = $state(null)
  let previewUrl = $state<string | null>(null)
  let isRemoving = $state(false)

  const displayAvatarUrl = $derived(isRemoving ? null : (previewUrl ?? user?.avatarUrl))

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
    uploadAvatar(file)
  }

  function uploadAvatar(file: File) {
    $updateAvatarMutation.mutate(
      { avatar: file },
      {
        onSuccess: response => {
          if (response.kind === GoodAvatarUpdated.kind) {
            toast.success('Avatar updated!')
            queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
            previewUrl = null
          } else {
            toast.error(response.message)
          }
        },
        onError: error => {
          toast.error(error.message)
          previewUrl = null
        },
      }
    )
  }

  function removeAvatar() {
    isRemoving = true
    $updateAvatarMutation.mutate(
      {},
      {
        onSuccess: response => {
          if (response.kind === GoodAvatarUpdated.kind) {
            toast.success('Avatar removed!')
            queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
          } else {
            toast.error(response.message)
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

{#if user && clientConfig}
  <Section.Root>
    <Section.Header>Team avatar</Section.Header>
    <Section.Content>
      <div class="flex items-center gap-4">
        <div class="relative">
          {#key displayAvatarUrl}
            <Avatar.Root class="size-18 rounded-lg">
              {#if displayAvatarUrl}
                <Avatar.Image src={displayAvatarUrl} alt={user.name} class="rounded-lg" />
              {/if}
              <Avatar.Fallback class="rounded-lg text-xl">
                {getInitials(user.name)}
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
            {user.avatarUrl ? 'Change' : 'Upload'}
          </Button>
          {#if user.avatarUrl}
            <Button variant="destructive" size="sm" onclick={removeAvatar} disabled={loading}>
              <IconTrashFilled class="size-4" />
              Remove
            </Button>
          {/if}
        </div>
      </div>

      <CaptchaNotice config={clientConfig} action={ProtectedAction.AvatarUpload} class="mt-3" />
    </Section.Content>
  </Section.Root>
{/if}

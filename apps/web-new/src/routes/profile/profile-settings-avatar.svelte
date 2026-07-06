<script lang="ts">
  import type { ClientConfig, UserProfile } from '@rctf/types'
  import { GoodAvatarUpdated, ProtectedAction, UpdateAvatarRoute } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { apiRequest, showApiError } from '$lib/api'
  import AvatarUpload from '$lib/components/avatar-upload.svelte'
  import CaptchaNotice from '$lib/components/captcha-notice.svelte'
  import { queryKeys } from '$lib/query/keys'
  import { toast } from '$lib/toast'

  type Props = {
    user: UserProfile
    clientConfig: ClientConfig
  }

  let { user, clientConfig }: Props = $props()

  const queryClient = useQueryClient()
  let loading = $state(false)

  // Omitting the `avatar` field removes the current avatar (API contract).
  async function submitAvatar(args: { avatar?: File }, successMessage: string): Promise<boolean> {
    loading = true
    try {
      const response = await apiRequest(UpdateAvatarRoute, args)
      if (response.kind === GoodAvatarUpdated.kind) {
        toast.success(successMessage)
        queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
        return true
      }
      showApiError(response)
      return false
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Avatar update failed')
      return false
    } finally {
      loading = false
    }
  }

  const uploadAvatar = (file: File) => submitAvatar({ avatar: file }, 'Avatar updated!')
  const removeAvatar = () => submitAvatar({}, 'Avatar removed!')
</script>

<AvatarUpload
  name={user.name}
  avatarUrl={user.avatarUrl}
  {loading}
  onUpload={uploadAvatar}
  onRemove={removeAvatar}
>
  <CaptchaNotice config={clientConfig} action={ProtectedAction.AvatarUpload} />
</AvatarUpload>

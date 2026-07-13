<script lang="ts">
  import type { ClientConfig, UserProfile } from '@rctf/types'
  import {
    GoodAvatarUpdated,
    ProtectedAction,
    UpdateAvatarRoute,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { apiRequest, showApiError } from '$lib/api'
  import AvatarUpload from '$lib/components/avatar-upload.svelte'
  import CaptchaNotice from '$lib/components/captcha-notice.svelte'
  import { queryKeys } from '$lib/query/keys'
  import { toast } from '$lib/toast'
  import { createAsyncAction } from '$lib/utils/async-action.svelte'

  type Props = {
    user: UserProfile
    clientConfig: ClientConfig
  }

  let { user, clientConfig }: Props = $props()

  const queryClient = useQueryClient()
  const avatarAction = createAsyncAction()

  async function submitAvatar(
    args: { avatar?: File },
    successMessage: string
  ): Promise<boolean> {
    const result = await avatarAction.run(
      async () => {
        const response = await apiRequest(UpdateAvatarRoute, args)
        if (response.kind === GoodAvatarUpdated.kind) {
          toast.success(successMessage)
          queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
          return true
        }
        showApiError(response)
        return false
      },
      { errorMessage: 'Avatar update failed' }
    )
    return result ?? false
  }

  const uploadAvatar = (file: File) =>
    submitAvatar({ avatar: file }, 'Avatar updated!')
  const removeAvatar = () => submitAvatar({}, 'Avatar removed!')
</script>

<AvatarUpload
  name={user.name}
  avatarUrl={user.avatarUrl}
  loading={avatarAction.pending}
  onUpload={uploadAvatar}
  onRemove={removeAvatar}
>
  <CaptchaNotice config={clientConfig} action={ProtectedAction.AvatarUpload} />
</AvatarUpload>

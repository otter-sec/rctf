<script lang="ts">
  import type { ClientConfig, UserProfile } from '@rctf/types'
  import { GoodAvatarUpdated, ProtectedAction } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { showApiError } from '$lib/api'
  import { AvatarUpload } from '$lib/components'
  import CaptchaNotice from '$lib/components/captcha-notice.svelte'
  import { queryKeys, useUpdateAvatarMutation } from '$lib/query'
  import { toast } from 'svelte-sonner'

  interface Props {
    user: UserProfile
    clientConfig: ClientConfig
  }

  let { user, clientConfig }: Props = $props()

  const queryClient = useQueryClient()
  const mutation = useUpdateAvatarMutation()
  const loading = $derived(mutation.isPending)

  function refresh() {
    queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
  }

  function uploadAvatar(file: File): Promise<boolean> {
    return new Promise(resolve => {
      mutation.mutate(
        { avatar: file },
        {
          onSuccess: response => {
            if (response.kind === GoodAvatarUpdated.kind) {
              toast.success('Avatar updated!')
              refresh()
              resolve(true)
            } else {
              showApiError(response)
              resolve(false)
            }
          },
          onError: error => {
            toast.error(error.message)
            resolve(false)
          },
        }
      )
    })
  }

  function removeAvatar(): Promise<boolean> {
    return new Promise(resolve => {
      mutation.mutate(
        {},
        {
          onSuccess: response => {
            if (response.kind === GoodAvatarUpdated.kind) {
              toast.success('Avatar removed!')
              refresh()
              resolve(true)
            } else {
              showApiError(response)
              resolve(false)
            }
          },
          onError: error => {
            toast.error(error.message)
            resolve(false)
          },
        }
      )
    })
  }
</script>

<AvatarUpload
  name={user.name}
  avatarUrl={user.avatarUrl}
  {loading}
  onUpload={uploadAvatar}
  onRemove={removeAvatar}
>
  <CaptchaNotice config={clientConfig} action={ProtectedAction.AvatarUpload} class="mt-3" />
</AvatarUpload>

<script lang="ts">
  import { GoodAvatarUpdated } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { showApiError } from '$lib/api'
  import { AvatarUpload } from '$lib/components'
  import { useUpdateAdminUserAvatarMutation } from '$lib/query'
  import { toast } from 'svelte-sonner'
  import { invalidateAdminTeamQueries } from './admin-profile-queries'

  interface Props {
    id: string
    team: { name: string; avatarUrl: string | null }
  }

  let { id, team }: Props = $props()

  const queryClient = useQueryClient()
  const mutation = useUpdateAdminUserAvatarMutation()
  const loading = $derived(mutation.isPending)

  const refresh = () => invalidateAdminTeamQueries(queryClient, { teamId: id })

  function uploadAvatar(file: File): Promise<boolean> {
    return new Promise(resolve => {
      mutation.mutate(
        { id, avatar: file },
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
        { id },
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
  name={team.name}
  avatarUrl={team.avatarUrl}
  {loading}
  onUpload={uploadAvatar}
  onRemove={removeAvatar}
/>

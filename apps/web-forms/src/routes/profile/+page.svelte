<script lang="ts">
  import {
    CreateMemberRoute,
    DeleteEmailRoute,
    DeleteMemberRoute,
    GoodAvatarUpdated,
    GoodEmailRemoved,
    GoodMemberDelete,
    SetEmailRouteV2,
    UpdateUserRouteV2,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { apiRequest } from '$lib/api'
  import { useApiForm } from '$lib/forms'
  import {
    queryKeys,
    useClientConfig,
    useCurrentUser,
    useMembers,
    useUpdateAvatarMutation,
  } from '$lib/query'

  const MAX_AVATAR_SIZE = 1024 * 1024 // 1MB

  const queryClient = useQueryClient()
  const userQuery = useCurrentUser()
  const configQuery = useClientConfig()
  const membersQuery = useMembers()
  const avatarMutation = useUpdateAvatarMutation()

  const user = $derived($userQuery.data)
  const config = $derived($configQuery.data)
  const members = $derived($membersQuery.data ?? [])

  const invalidateUser = () => queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
  const invalidateMembers = () => queryClient.invalidateQueries({ queryKey: queryKeys.members })

  const profileForm = useApiForm(UpdateUserRouteV2, { onSuccess: invalidateUser })
  const emailForm = useApiForm(SetEmailRouteV2, { onSuccess: invalidateUser })
  const memberForm = useApiForm(CreateMemberRoute, {
    onSuccess: () => {
      invalidateMembers()
      memberForm.reset()
    },
  })

  let initialized = $state(false)
  let deleting = $state<string | null>(null)
  let fileInput = $state<HTMLInputElement | null>(null)
  let avatarUploading = $state(false)

  function getInitials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase()
  }

  function handleAvatarSelect(e: Event) {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    if (file.size > MAX_AVATAR_SIZE) {
      alert(`File too large. Maximum size is ${(MAX_AVATAR_SIZE / 1024 / 1024).toFixed(0)}MB`)
      input.value = ''
      return
    }

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      input.value = ''
      return
    }

    uploadAvatar(file)
  }

  function uploadAvatar(file: File) {
    avatarUploading = true
    $avatarMutation.mutate(
      { avatar: file },
      {
        onSuccess: response => {
          if (response.kind === GoodAvatarUpdated.kind) {
            alert('Avatar updated!')
            invalidateUser()
          } else {
            alert(response.message)
          }
          avatarUploading = false
        },
        onError: error => {
          alert(error.message)
          avatarUploading = false
        },
      }
    )
  }

  function removeAvatar() {
    avatarUploading = true
    $avatarMutation.mutate(
      {},
      {
        onSuccess: response => {
          if (response.kind === GoodAvatarUpdated.kind) {
            alert('Avatar removed!')
            invalidateUser()
          } else {
            alert(response.message)
          }
          avatarUploading = false
        },
        onError: error => {
          alert(error.message)
          avatarUploading = false
        },
      }
    )
  }

  $effect(() => {
    if (user && !initialized) {
      profileForm.setData({ name: user.name, division: user.division })
      emailForm.setData({ email: user.email ?? '' })
      initialized = true
    }
  })

  async function deleteEmail() {
    deleting = 'email'
    const res = await apiRequest(DeleteEmailRoute, {})
    if (res.kind === GoodEmailRemoved.kind) {
      invalidateUser()
      emailForm.setData({ email: '' })
    }
    deleting = null
  }

  async function deleteMember(id: string) {
    deleting = id
    const res = await apiRequest(DeleteMemberRoute, { id })
    if (res.kind === GoodMemberDelete.kind) invalidateMembers()
    deleting = null
  }

  function submitEmail(e: Event) {
    e.preventDefault()
    const email = emailForm.data.email?.trim() ?? ''
    if (email === '' && user?.email) deleteEmail()
    else if (email) emailForm.submit()
  }
</script>

<h1>Profile</h1>

{#if $userQuery.isPending}
  <p>Loading...</p>
{:else if !user}
  <p>Not logged in. <a href="/login">Login</a></p>
{:else}
  <section>
    <h2>Team Avatar</h2>
    <div>
      {#if user.avatarUrl}
        <img
          src={user.avatarUrl}
          alt={user.name}
          width="80"
          height="80"
          style="border-radius: 8px; object-fit: cover;"
        />
      {:else}
        <div
          style="width: 80px; height: 80px; border-radius: 8px; background: #ddd; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold;"
        >
          {getInitials(user.name)}
        </div>
      {/if}
    </div>
    <div style="margin-top: 0.5rem;">
      <input
        bind:this={fileInput}
        type="file"
        accept="image/*"
        style="display: none;"
        onchange={handleAvatarSelect}
      />
      <button type="button" onclick={() => fileInput?.click()} disabled={avatarUploading}>
        {avatarUploading ? 'Uploading...' : user.avatarUrl ? 'Change Avatar' : 'Upload Avatar'}
      </button>
      {#if user.avatarUrl}
        <button type="button" onclick={removeAvatar} disabled={avatarUploading}>
          {avatarUploading ? 'Removing...' : 'Remove Avatar'}
        </button>
      {/if}
    </div>
  </section>

  <hr />

  <section>
    <h2>Update Profile</h2>
    <form onsubmit={profileForm.submit}>
      <label>
        Team Name
        <input type="text" bind:value={profileForm.data.name} />
      </label>
      {#if profileForm.errors.name}<em>{profileForm.errors.name}</em>{/if}

      {#if config && Object.keys(config.divisions).length > 1}
        <label>
          Division
          <select bind:value={profileForm.data.division}>
            {#each Object.entries(config.divisions) as [value, label]}
              <option {value}>{label}</option>
            {/each}
          </select>
        </label>
      {/if}

      {#if profileForm.errors._form}<p style="color:red">{profileForm.errors._form}</p>{/if}
      <button disabled={profileForm.submitting}
        >{profileForm.submitting ? 'Saving...' : 'Save'}</button
      >
    </form>
  </section>

  <hr />

  <section>
    <h2>Email</h2>
    <form onsubmit={submitEmail}>
      <label>
        Email (optional)
        <input type="email" bind:value={emailForm.data.email} />
      </label>
      {#if emailForm.errors.email}<em>{emailForm.errors.email}</em>{/if}
      {#if emailForm.errors._form}<p style="color:red">{emailForm.errors._form}</p>{/if}
      <button disabled={emailForm.submitting || deleting === 'email'}>
        {emailForm.submitting || deleting === 'email' ? 'Updating...' : 'Update'}
      </button>
    </form>
  </section>

  <hr />

  <section>
    <h2>Team Members ({members.length})</h2>
    {#if members.length > 0}
      <ul>
        {#each members as m}
          <li>
            {m.email}
            <button onclick={() => deleteMember(m.id)} disabled={deleting === m.id}>
              {deleting === m.id ? 'Removing...' : 'Remove'}
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p>No members yet.</p>
    {/if}

    <form onsubmit={memberForm.submit}>
      <label>
        Add member by email
        <input type="email" bind:value={memberForm.data.email} />
      </label>
      {#if memberForm.errors.email}<em>{memberForm.errors.email}</em>{/if}
      {#if memberForm.errors._form}<p style="color:red">{memberForm.errors._form}</p>{/if}
      <button disabled={memberForm.submitting}>{memberForm.submitting ? 'Adding...' : 'Add'}</button
      >
    </form>
  </section>

  <hr />

  <section>
    <h2>Stats</h2>
    <p>Score: {user.score}, Solves: {user.solves.length}</p>
  </section>
{/if}

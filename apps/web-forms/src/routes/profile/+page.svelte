<script lang="ts">
  import {
    CreateMemberRoute,
    DeleteEmailRoute,
    DeleteMemberRoute,
    GoodEmailRemoved,
    GoodMemberDelete,
    SetEmailRouteV2,
    UpdateUserRouteV2,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { apiRequest } from '$lib/api'
  import { useApiForm } from '$lib/forms'
  import { queryKeys, useClientConfig, useCurrentUser, useMembers } from '$lib/query'

  const queryClient = useQueryClient()
  const userQuery = useCurrentUser()
  const configQuery = useClientConfig()
  const membersQuery = useMembers()

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
        >{profileForm.submitting ? 'Saving...' : 'Save'}</button>
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
      <button disabled={memberForm.submitting}
        >{memberForm.submitting ? 'Adding...' : 'Add'}</button>
    </form>
  </section>

  <hr />

  <section>
    <h2>Stats</h2>
    <p>Score: {user.score}, Solves: {user.solves.length}</p>
  </section>
{/if}

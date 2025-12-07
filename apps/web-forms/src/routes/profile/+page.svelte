<script lang="ts">
  import {
    GoodUserUpdateV2,
    GoodEmailSet,
    GoodVerifySent,
    GoodEmailRemoved,
    GoodMemberCreate,
    GoodMemberDelete,
    UpdateUserRouteV2,
    SetEmailRouteV2,
    DeleteEmailRoute,
    CreateMemberRoute,
    DeleteMemberRoute,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { useMutationForm, required, email, name, compose } from '$lib/forms'
  import { queryKeys, useClientConfig, useCurrentUser, useMembers } from '$lib/query'

  const queryClient = useQueryClient()
  const userQuery = useCurrentUser()
  const configQuery = useClientConfig()
  const membersQuery = useMembers()

  const user = $derived($userQuery.data)
  const config = $derived($configQuery.data)
  const members = $derived($membersQuery.data ?? [])

  let initialized = $state(false)

  const profileForm = useMutationForm({
    route: UpdateUserRouteV2,
    initial: { name: '', division: '' },
    validators: { name: compose(required, name) },
    transform: values => ({
      name: values.name !== user?.name ? values.name : undefined,
      division: values.division !== user?.division ? values.division : undefined,
    }),
    onSuccess: response => {
      if (response.kind === GoodUserUpdateV2.kind) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
      }
    },
  })

  const emailForm = useMutationForm({
    route: SetEmailRouteV2,
    initial: { email: '' },
    validators: { email: email },
    onSuccess: response => {
      if (response.kind === GoodEmailSet.kind || response.kind === GoodVerifySent.kind) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
      }
    },
  })

  const deleteEmailForm = useMutationForm({
    route: DeleteEmailRoute,
    initial: {},
    onSuccess: response => {
      if (response.kind === GoodEmailRemoved.kind) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
        emailForm.setValue('email', '')
      }
    },
  })

  const memberForm = useMutationForm({
    route: CreateMemberRoute,
    initial: { email: '' },
    validators: { email: compose(required, email) },
    onSuccess: response => {
      if (response.kind === GoodMemberCreate.kind) {
        queryClient.invalidateQueries({ queryKey: queryKeys.members })
        memberForm.reset()
      }
    },
  })

  const deleteMemberForm = useMutationForm({
    route: DeleteMemberRoute,
    initial: { id: '' },
    onSuccess: response => {
      if (response.kind === GoodMemberDelete.kind) {
        queryClient.invalidateQueries({ queryKey: queryKeys.members })
      }
    },
  })

  $effect(() => {
    if (user && !initialized) {
      profileForm.setValue('name', user.name)
      profileForm.setValue('division', user.division)
      emailForm.setValue('email', user.email ?? '')
      initialized = true
    }
  })

  function handleEmailSubmit(e: SubmitEvent) {
    e.preventDefault()
    const newEmail = emailForm.values.email.trim()

    if (newEmail === '' && user?.email) {
      deleteEmailForm.submit()
    } else if (newEmail !== '') {
      emailForm.submit()
    }
  }

  function handleDeleteMember(id: string) {
    deleteMemberForm.setValue('id', id)
    deleteMemberForm.submit()
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
    <form onsubmit={profileForm.handleSubmit}>
      <div>
        <label for="name">Team Name</label>
        <input
          id="name"
          type="text"
          value={profileForm.values.name}
          oninput={e => profileForm.setValue('name', e.currentTarget.value)}
          onblur={() => profileForm.setTouched('name')}
          minlength={2}
          maxlength={64}
          required />
        {#if profileForm.errors.name && profileForm.touched.name}
          <span style="color: red">{profileForm.errors.name}</span>
        {/if}
      </div>

      {#if config && Object.keys(config.divisions).length > 1}
        <div>
          <label for="division">Division</label>
          <select
            id="division"
            value={profileForm.values.division}
            onchange={e => profileForm.setValue('division', e.currentTarget.value)}>
            {#each Object.entries(config.divisions) as [value, label]}
              <option {value}>{label}</option>
            {/each}
          </select>
        </div>
      {/if}

      <button type="submit" disabled={profileForm.isPending}>
        {profileForm.isPending ? 'Saving...' : 'Save Profile'}
      </button>
    </form>
  </section>

  <hr />

  <section>
    <h2>Email</h2>
    <form onsubmit={handleEmailSubmit}>
      <div>
        <label for="email">Email (optional)</label>
        <input
          id="email"
          type="email"
          value={emailForm.values.email}
          oninput={e => emailForm.setValue('email', e.currentTarget.value)}
          onblur={() => emailForm.setTouched('email')} />
        {#if emailForm.errors.email && emailForm.touched.email}
          <span style="color: red">{emailForm.errors.email}</span>
        {/if}
      </div>

      <button type="submit" disabled={emailForm.isPending || deleteEmailForm.isPending}>
        {emailForm.isPending || deleteEmailForm.isPending ? 'Updating...' : 'Update Email'}
      </button>
    </form>
  </section>

  <hr />

  <section>
    <h2>Team Members ({members.length})</h2>

    {#if members.length > 0}
      <ul>
        {#each members as member}
          <li>
            {member.email}
            <button onclick={() => handleDeleteMember(member.id)}>Remove</button>
          </li>
        {/each}
      </ul>
    {:else}
      <p>No team members yet.</p>
    {/if}

    <form onsubmit={memberForm.handleSubmit}>
      <div>
        <label for="memberEmail">Add member by email</label>
        <input
          id="memberEmail"
          type="email"
          value={memberForm.values.email}
          oninput={e => memberForm.setValue('email', e.currentTarget.value)}
          onblur={() => memberForm.setTouched('email')}
          required />
        {#if memberForm.errors.email && memberForm.touched.email}
          <span style="color: red">{memberForm.errors.email}</span>
        {/if}
      </div>

      <button type="submit" disabled={memberForm.isPending}>
        {memberForm.isPending ? 'Adding...' : 'Add Member'}
      </button>
    </form>
  </section>

  <hr />

  <section>
    <h2>Stats</h2>
    <p>Score: {user.score}</p>
    <p>Solves: {user.solves.length}</p>
  </section>
{/if}

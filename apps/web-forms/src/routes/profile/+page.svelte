<script lang="ts">
  import {
    CreateMemberRoute,
    DeleteEmailRoute,
    DeleteMemberRoute,
    GoodEmailRemoved,
    GoodEmailSet,
    GoodMemberCreate,
    GoodMemberDelete,
    GoodUserUpdateV2,
    GoodVerifySent,
    SetEmailRouteV2,
    UpdateUserRouteV2,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { apiRequest } from '$lib/api'
  import { createApiForm } from '$lib/forms'
  import { queryKeys, useClientConfig, useCurrentUser, useMembers } from '$lib/query'

  const queryClient = useQueryClient()
  const userQuery = useCurrentUser()
  const configQuery = useClientConfig()
  const membersQuery = useMembers()

  const user = $derived($userQuery.data)
  const config = $derived($configQuery.data)
  const members = $derived($membersQuery.data ?? [])

  let initialized = $state(false)

  const profileForm = createApiForm({
    route: UpdateUserRouteV2,
    defaultValues: { name: '', division: '' },
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

  const emailForm = createApiForm({
    route: SetEmailRouteV2,
    defaultValues: { email: '' },
    onSuccess: response => {
      if (response.kind === GoodEmailSet.kind || response.kind === GoodVerifySent.kind) {
        queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
      }
    },
  })

  const memberForm = createApiForm({
    route: CreateMemberRoute,
    defaultValues: { email: '' },
    onSuccess: response => {
      if (response.kind === GoodMemberCreate.kind) {
        queryClient.invalidateQueries({ queryKey: queryKeys.members })
        memberForm.reset()
      }
    },
  })

  let isDeletingEmail = $state(false)
  let isDeletingMember = $state<string | null>(null)

  async function handleDeleteEmail() {
    isDeletingEmail = true
    const response = await apiRequest(DeleteEmailRoute, {})
    if (response.kind === GoodEmailRemoved.kind) {
      queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
      emailForm.setFieldValue('email', '')
    }
    isDeletingEmail = false
  }

  async function handleDeleteMember(id: string) {
    isDeletingMember = id
    const response = await apiRequest(DeleteMemberRoute, { id })
    if (response.kind === GoodMemberDelete.kind) {
      queryClient.invalidateQueries({ queryKey: queryKeys.members })
    }
    isDeletingMember = null
  }

  $effect(() => {
    if (user && !initialized) {
      profileForm.setFieldValue('name', user.name)
      profileForm.setFieldValue('division', user.division)
      emailForm.setFieldValue('email', user.email ?? '')
      initialized = true
    }
  })

  function handleEmailSubmit(e: SubmitEvent) {
    e.preventDefault()
    e.stopPropagation()
    const newEmail = emailForm.getFieldValue('email').trim()

    if (newEmail === '' && user?.email) {
      handleDeleteEmail()
    } else if (newEmail !== '') {
      emailForm.handleSubmit()
    }
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
    <form
      onsubmit={e => {
        e.preventDefault()
        e.stopPropagation()
        profileForm.handleSubmit()
      }}>
      <div>
        <profileForm.Field name="name">
          {#snippet children(field)}
            <label for={field.name}>Team Name</label>
            <input
              id={field.name}
              name={field.name}
              type="text"
              value={field.state.value}
              oninput={e => field.handleChange(e.currentTarget.value)}
              onblur={field.handleBlur}
              minlength={2}
              maxlength={64}
              required />
            {#if field.state.meta.errors.length > 0}
              <span style="color: red"
                >{field.state.meta.errors.map(e => e.message).join(', ')}</span>
            {/if}
          {/snippet}
        </profileForm.Field>
      </div>

      {#if config && Object.keys(config.divisions).length > 1}
        <div>
          <profileForm.Field name="division">
            {#snippet children(field)}
              <label for={field.name}>Division</label>
              <select
                id={field.name}
                name={field.name}
                value={field.state.value}
                onchange={e => field.handleChange(e.currentTarget.value)}>
                {#each Object.entries(config.divisions) as [value, label]}
                  <option {value}>{label}</option>
                {/each}
              </select>
            {/snippet}
          </profileForm.Field>
        </div>
      {/if}

      <profileForm.Subscribe selector={state => state.errorMap.onSubmit}>
        {#snippet children(error)}
          {#if error}
            <p style="color: red">{error}</p>
          {/if}
        {/snippet}
      </profileForm.Subscribe>

      <profileForm.Subscribe selector={state => [state.canSubmit, state.isSubmitting]}>
        {#snippet children([canSubmit, isSubmitting])}
          <button type="submit" disabled={!canSubmit}>
            {isSubmitting ? 'Saving...' : 'Save Profile'}
          </button>
        {/snippet}
      </profileForm.Subscribe>
    </form>
  </section>

  <hr />

  <section>
    <h2>Email</h2>
    <form onsubmit={handleEmailSubmit}>
      <div>
        <emailForm.Field name="email">
          {#snippet children(field)}
            <label for={field.name}>Email (optional)</label>
            <input
              id={field.name}
              name={field.name}
              type="email"
              value={field.state.value}
              oninput={e => field.handleChange(e.currentTarget.value)}
              onblur={field.handleBlur} />
            {#if field.state.meta.errors.length > 0}
              <span style="color: red"
                >{field.state.meta.errors.map(e => e.message).join(', ')}</span>
            {/if}
          {/snippet}
        </emailForm.Field>
      </div>

      <emailForm.Subscribe selector={state => state.errorMap.onSubmit}>
        {#snippet children(error)}
          {#if error}
            <p style="color: red">{error}</p>
          {/if}
        {/snippet}
      </emailForm.Subscribe>

      <emailForm.Subscribe selector={state => state.isSubmitting}>
        {#snippet children(isSubmitting)}
          <button type="submit" disabled={isSubmitting || isDeletingEmail}>
            {isSubmitting || isDeletingEmail ? 'Updating...' : 'Update Email'}
          </button>
        {/snippet}
      </emailForm.Subscribe>
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
            <button
              onclick={() => handleDeleteMember(member.id)}
              disabled={isDeletingMember === member.id}>
              {isDeletingMember === member.id ? 'Removing...' : 'Remove'}
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      <p>No team members yet.</p>
    {/if}

    <form
      onsubmit={e => {
        e.preventDefault()
        e.stopPropagation()
        memberForm.handleSubmit()
      }}>
      <div>
        <memberForm.Field name="email">
          {#snippet children(field)}
            <label for="memberEmail">Add member by email</label>
            <input
              id="memberEmail"
              name={field.name}
              type="email"
              value={field.state.value}
              oninput={e => field.handleChange(e.currentTarget.value)}
              onblur={field.handleBlur}
              required />
            {#if field.state.meta.errors.length > 0}
              <span style="color: red"
                >{field.state.meta.errors.map(e => e.message).join(', ')}</span>
            {/if}
          {/snippet}
        </memberForm.Field>
      </div>

      <memberForm.Subscribe selector={state => state.errorMap.onSubmit}>
        {#snippet children(error)}
          {#if error}
            <p style="color: red">{error}</p>
          {/if}
        {/snippet}
      </memberForm.Subscribe>

      <memberForm.Subscribe selector={state => [state.canSubmit, state.isSubmitting]}>
        {#snippet children([canSubmit, isSubmitting])}
          <button type="submit" disabled={!canSubmit}>
            {isSubmitting ? 'Adding...' : 'Add Member'}
          </button>
        {/snippet}
      </memberForm.Subscribe>
    </form>
  </section>

  <hr />

  <section>
    <h2>Stats</h2>
    <p>Score: {user.score}</p>
    <p>Solves: {user.solves.length}</p>
  </section>
{/if}

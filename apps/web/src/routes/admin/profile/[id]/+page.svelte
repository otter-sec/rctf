<script lang="ts">
  import { GoodChallengeSolveDeleteV2, Permissions } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { showApiError } from '$lib/api'
  import { Button, Card, ScrollArea, Spinner, Tabs } from '$lib/components'
  import {
    queryKeys,
    useAdminUser,
    useClientConfig,
    useCurrentUser,
    useDeleteChallengeSolveMutation,
    useLeaderboardChallenges,
    useUserGraph,
    useUserProfile,
  } from '$lib/query'
  import { hasPermissions } from '$lib/utils'
  import { toast } from 'svelte-sonner'
  import ProfileAnalytics from '../../../profile/profile-analytics.svelte'
  import ProfileHeader from '../../../profile/profile-header.svelte'
  import ProfileSolves from '../../../profile/profile-solves.svelte'
  import type { AdminTeamDetails } from '../../teams/teams-model'
  import AdminProfileActions from './admin-profile-actions.svelte'
  import AdminProfileAvatar from './admin-profile-avatar.svelte'
  import AdminProfileEdit from './admin-profile-edit.svelte'

  const id = $derived(page.params.id!)

  const clientConfigQuery = useClientConfig()
  const clientConfig = $derived(clientConfigQuery.data)
  const challengesQuery = useLeaderboardChallenges()
  const challenges = $derived(
    Object.entries(challengesQuery.data ?? {}).map(([cid, c]) => ({
      id: cid,
      name: c.name,
      category: c.category,
      points: c.points,
      solves: c.solves,
      scoringKind: c.scoringKind,
    }))
  )

  const userQuery = useUserProfile(() => id)
  const user = $derived(userQuery.data)
  const isPending = $derived(userQuery.isPending)
  const error = $derived(userQuery.error?.message)

  const adminQuery = useAdminUser(() => id)
  const adminUser = $derived(adminQuery.data as AdminTeamDetails | undefined)

  const graphQuery = useUserGraph(
    () => id,
    () => user?.globalPlace ?? null
  )
  const graphData = $derived(graphQuery.data ?? null)

  const viewerQuery = useCurrentUser()
  const viewer = $derived(viewerQuery.data)
  const canManage = $derived(hasPermissions(viewer, Permissions.usersWrite))
  const canRevoke = $derived(hasPermissions(viewer, Permissions.challsSolveWrite))

  const queryClient = useQueryClient()
  const revokeMutation = useDeleteChallengeSolveMutation()
  let revokingChallengeId = $state<string | null>(null)

  function handleRevoke(challengeId: string, challengeName: string) {
    revokingChallengeId = challengeId
    revokeMutation.mutate(
      { challengeId, userId: id },
      {
        onSuccess: response => {
          if (response.kind === GoodChallengeSolveDeleteV2.kind) {
            toast.success(`Solve revoked for ${challengeName}`)
            queryClient.invalidateQueries({ queryKey: queryKeys.adminUser(id) })
            queryClient.invalidateQueries({ queryKey: queryKeys.userById(id) })
            queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
            queryClient.invalidateQueries({ queryKey: queryKeys.fullLeaderboard })
            queryClient.invalidateQueries({ queryKey: queryKeys.leaderboardChallenges })
          } else {
            showApiError(response)
          }
          revokingChallengeId = null
        },
        onError: error => {
          toast.error(error.message)
          revokingChallengeId = null
        },
      }
    )
  }

  function handleViewSubmissions(challengeId: string) {
    goto(`/admin/submissions?team=${id}&challenge=${challengeId}`)
  }
</script>

<svelte:head>
  {#if user && clientConfig}
    <title>{user.name} · Admin | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

{#snippet solvesPanel()}
  {#if user}
    <ProfileSolves
      {challenges}
      solves={user.solves}
      dynamicScores={user.dynamicScores}
      showUnsolved={challenges.length > 0}
      scrollable
      class="min-h-0 flex-1"
      ctfStartTime={clientConfig?.startTime}
      onRevoke={canRevoke ? handleRevoke : undefined}
      onViewSubmissions={canManage ? handleViewSubmissions : undefined}
      revokingId={revokingChallengeId}
    />
  {/if}
{/snippet}

{#snippet analyticsPanel()}
  {#if user && clientConfig}
    <ScrollArea
      class="h-full"
      fadeSize={32}
      fadeColor="background-l1"
      scrollbarYClasses="z-30 mt-4"
      viewportTabIndex={-1}
    >
      <ProfileAnalytics {user} {clientConfig} {challenges} {graphData} />
    </ScrollArea>
  {/if}
{/snippet}

{#snippet managePanel()}
  {#if !canManage}
    <Card.Root>
      <Card.Content class="text-foreground-l3 py-6 text-center text-sm">
        You don't have permission to manage teams.
      </Card.Content>
    </Card.Root>
  {:else if adminUser && clientConfig}
    {#key adminUser.id}
      <AdminProfileAvatar id={adminUser.id} team={adminUser} />
      <AdminProfileEdit id={adminUser.id} team={adminUser} {clientConfig} />
      <AdminProfileActions id={adminUser.id} team={adminUser} />
    {/key}
  {:else}
    <div class="flex items-center justify-center py-10">
      <Spinner class="size-5" />
    </div>
  {/if}
{/snippet}

<div class="flex flex-1 flex-col px-4 md:px-9">
  {#if user && clientConfig}
    <div
      class="bg-background-l1 mx-auto flex h-[calc(100dvh-72px)] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl lg:hidden"
    >
      <div class="bg-background-l1 z-10 shrink-0 pt-2">
        <ProfileHeader {user} {clientConfig} />
      </div>

      <Tabs.Root value="manage" class="min-h-0 flex-1">
        <div class="bg-background-l1 z-10 shrink-0 px-4 pb-2">
          <Tabs.List class="grid h-10 w-full grid-cols-3">
            <Tabs.Trigger value="manage">Manage</Tabs.Trigger>
            <Tabs.Trigger value="solves">Solves</Tabs.Trigger>
            <Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
          </Tabs.List>
        </div>

        <Tabs.Content value="manage" class="min-h-0">
          <ScrollArea class="h-full" fadeSize={32} fadeColor="background-l1" viewportTabIndex={-1}>
            <div class="flex flex-col gap-4 px-4 pb-4">
              {@render managePanel()}
            </div>
          </ScrollArea>
        </Tabs.Content>

        <Tabs.Content value="solves" class="min-h-0">
          {@render solvesPanel()}
        </Tabs.Content>

        <Tabs.Content value="analytics" class="min-h-0">
          {@render analyticsPanel()}
        </Tabs.Content>
      </Tabs.Root>
    </div>

    <div class="mx-auto hidden h-[calc(100dvh-72px)] w-full max-w-400 grid-cols-2 gap-4 lg:grid">
      <div class="bg-background-l1 flex min-h-0 flex-col overflow-hidden rounded-t-3xl">
        <div class="bg-background-l1 z-10 shrink-0 pt-2">
          <ProfileHeader {user} {clientConfig} />
        </div>

        <Tabs.Root value="solves" class="flex min-h-0 flex-1 flex-col">
          <div class="bg-background-l1 z-10 shrink-0 px-4 pb-2">
            <Tabs.List class="grid h-10 w-full grid-cols-2">
              <Tabs.Trigger value="solves">Solves</Tabs.Trigger>
              <Tabs.Trigger value="analytics">Analytics</Tabs.Trigger>
            </Tabs.List>
          </div>

          <Tabs.Content value="solves" class="min-h-0">
            {@render solvesPanel()}
          </Tabs.Content>

          <Tabs.Content value="analytics" class="min-h-0">
            {@render analyticsPanel()}
          </Tabs.Content>
        </Tabs.Root>
      </div>

      <div class="bg-background-l1 flex min-h-0 flex-col overflow-hidden rounded-t-3xl">
        <ScrollArea
          class="min-h-0 flex-1"
          fadeSize={32}
          fadeColor="background-l1"
          scrollbarYClasses="z-30 mt-4"
          viewportTabIndex={-1}
        >
          <div class="flex flex-col gap-4 px-4 pt-4 pb-4">
            {@render managePanel()}
          </div>
        </ScrollArea>
      </div>
    </div>
  {:else if isPending}
    <div class="flex flex-1 items-center justify-center">
      <Spinner class="size-4" />
    </div>
  {:else}
    <Card.Root>
      <Card.Header>
        <Card.Title class="text-xl font-medium">Team not found</Card.Title>
      </Card.Header>
      <Card.Content class="flex flex-col gap-4">
        <p class="text-foreground-l3">{error ?? 'The requested team could not be found.'}</p>
        <Button href="/admin/teams">Back to teams</Button>
      </Card.Content>
    </Card.Root>
  {/if}
</div>

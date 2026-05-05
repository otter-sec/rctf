<script lang="ts">
  import {
    GoodAdminUserDeleteV2,
    GoodAdminUserUpdateV2,
    GoodChallengeSolveDeleteV2,
    GoodCreateUserTokenV2,
    Permissions,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { showApiError } from '$lib/api'
  import {
    Button,
    Card,
    Dialog,
    DropdownMenu,
    EmptyState,
    ScrollArea,
    Spinner,
    Tooltip,
    VirtualList,
  } from '$lib/components'
  import {
    IconCopy,
    IconDots,
    IconMoodX,
    IconShieldFilled,
    IconTrashFilled,
    IconTrophyFilled,
    IconUserCog,
    IconUserFilled,
  } from '$lib/icons'
  import {
    queryKeys,
    useAdminUser,
    useClientConfig,
    useCreateUserTokenMutation,
    useCurrentUser,
    useDeleteAdminUserMutation,
    useDeleteChallengeSolveMutation,
    useInfiniteAdminUsers,
    useUpdateAdminUserMutation,
  } from '$lib/query'
  import { formatLocalTime, hasPermissions, useInfiniteVirtualScroll } from '$lib/utils'
  import { toast } from 'svelte-sonner'
  import ChallengeDetailsSolvesRow from '../../challenges/challenge-details-solves-row.svelte'

  const ROW_HEIGHT = 68
  const PAGE_SIZE = 100

  const clientConfigQuery = useClientConfig()
  const queryClient = useQueryClient()
  const clientConfig = $derived(clientConfigQuery.data)
  const userQuery = useCurrentUser()
  const user = $derived(userQuery.data)
  const hasWritePerms = $derived(hasPermissions(user, Permissions.usersWrite))
  const hasSolveWritePerms = $derived(hasPermissions(user, Permissions.challsSolveWrite))
  const hasTeamDetailsPerms = $derived(
    hasWritePerms && hasPermissions(user, Permissions.challsRead)
  )

  const usersQuery = useInfiniteAdminUsers(() => PAGE_SIZE)
  const allTeams = $derived(usersQuery.data?.pages.flatMap(page => page.users) ?? [])

  const scroll = useInfiniteVirtualScroll({
    rowHeight: ROW_HEIGHT,
    overscan: 10,
    onLoadMore: () => usersQuery.fetchNextPage(),
  })

  $effect(() => {
    scroll.state.count = usersQuery.hasNextPage ? allTeams.length + 1 : allTeams.length
    scroll.state.hasNextPage = usersQuery.hasNextPage ?? false
    scroll.state.isFetching = usersQuery.isFetchingNextPage
  })

  const createTokenMutation = useCreateUserTokenMutation()
  const updateUserMutation = useUpdateAdminUserMutation()
  const deleteUserMutation = useDeleteAdminUserMutation()
  const deleteSolveMutation = useDeleteChallengeSolveMutation()

  let copyingTeamId = $state<string | null>(null)
  let updatingTeamId = $state<string | null>(null)
  let deletingTeamId = $state<string | null>(null)
  let revokingSolveKey = $state<string | null>(null)
  let selectedTeamId = $state<string | null>(null)
  let banDialogTeam = $state<{ id: string; name: string; banned: boolean } | null>(null)
  let deleteDialogTeam = $state<{ id: string; name: string } | null>(null)
  const selectedTeamQuery = useAdminUser(() => selectedTeamId)
  const selectedTeam = $derived(selectedTeamQuery.data)

  function refreshTeamQueries(teamId?: string) {
    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    if (teamId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminUser(teamId) })
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.fullLeaderboard })
    queryClient.invalidateQueries({ queryKey: queryKeys.leaderboardChallenges })
  }

  async function handleCopyToken(team: { id: string; name: string }) {
    copyingTeamId = team.id
    createTokenMutation.mutate(
      { id: team.id },
      {
        onSuccess: async response => {
          if (response.kind === GoodCreateUserTokenV2.kind) {
            try {
              await navigator.clipboard.writeText(response.data.token)
              toast.success(`Token copied for ${team.name}`)
            } catch {
              toast.error('Failed to copy token')
            }
          } else {
            showApiError(response)
          }
          copyingTeamId = null
        },
        onError: err => {
          toast.error(err.message)
          copyingTeamId = null
        },
      }
    )
  }

  async function copyToken(token: string) {
    try {
      await navigator.clipboard.writeText(token)
      toast.success('Token copied to clipboard')
    } catch {
      toast.error('Failed to copy token')
    }
  }

  function openManageTeam(teamId: string) {
    selectedTeamId = teamId
  }

  function closeManageTeam() {
    selectedTeamId = null
  }

  function openBanDialog(team: { id: string; name: string; banned: boolean }) {
    if (selectedTeamId === team.id) {
      closeManageTeam()
    }
    banDialogTeam = team
  }

  function closeBanDialog() {
    banDialogTeam = null
  }

  function handleBanAction(team: { id: string; name: string; banned: boolean }) {
    if (team.banned) {
      handleToggleBan(team)
      return
    }

    openBanDialog(team)
  }

  function handleToggleBan(
    team: { id: string; name: string; banned: boolean },
    onSuccess?: () => void
  ) {
    updatingTeamId = team.id
    updateUserMutation.mutate(
      {
        id: team.id,
        data: {
          banned: !team.banned,
        },
      },
      {
        onSuccess: response => {
          if (response.kind === GoodAdminUserUpdateV2.kind) {
            toast.success(`${team.name} ${team.banned ? 'unbanned' : 'banned'}`)
            refreshTeamQueries(team.id)
            onSuccess?.()
          } else {
            showApiError(response)
          }
          updatingTeamId = null
        },
        onError: err => {
          toast.error(err.message)
          updatingTeamId = null
        },
      }
    )
  }

  function handleConfirmBan() {
    if (!banDialogTeam) return
    handleToggleBan(banDialogTeam, closeBanDialog)
  }

  function openDeleteDialog(team: { id: string; name: string }) {
    if (selectedTeamId === team.id) {
      closeManageTeam()
    }
    deleteDialogTeam = team
  }

  function closeDeleteDialog() {
    deleteDialogTeam = null
  }

  function handleDeleteTeam() {
    if (!deleteDialogTeam) return

    const team = deleteDialogTeam
    deletingTeamId = team.id
    deleteUserMutation.mutate(
      { id: team.id },
      {
        onSuccess: response => {
          if (response.kind === GoodAdminUserDeleteV2.kind) {
            toast.success(`${team.name} deleted`)
            refreshTeamQueries(team.id)
            if (selectedTeamId === team.id) closeManageTeam()
            closeDeleteDialog()
          } else {
            showApiError(response)
          }
          deletingTeamId = null
        },
        onError: err => {
          toast.error(err.message)
          deletingTeamId = null
        },
      }
    )
  }

  function handleRevokeSolve(solve: { challengeId: string; challengeName: string }) {
    if (!selectedTeam) return

    const key = `${selectedTeam.id}:${solve.challengeId}`
    revokingSolveKey = key
    deleteSolveMutation.mutate(
      { challengeId: solve.challengeId, userId: selectedTeam.id },
      {
        onSuccess: response => {
          if (response.kind === GoodChallengeSolveDeleteV2.kind) {
            toast.success(`Solve revoked for ${solve.challengeName}`)
            refreshTeamQueries(selectedTeam.id)
          } else {
            showApiError(response)
          }
          revokingSolveKey = null
        },
        onError: err => {
          toast.error(err.message)
          revokingSolveKey = null
        },
      }
    )
  }
</script>

<svelte:head>
  {#if clientConfig}
    <title>Teams | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

<div class="flex h-[calc(100dvh-72px)] flex-col">
  {#if usersQuery.isPending}
    <div class="flex flex-1 items-center justify-center">
      <Spinner class="size-6" />
    </div>
  {:else if usersQuery.error}
    <div class="flex flex-1 items-center justify-center p-4">
      <Card.Root class="max-w-md">
        <Card.Header>
          <Card.Title>Error</Card.Title>
        </Card.Header>
        <Card.Content>
          <p class="text-foreground-l3">{usersQuery.error.message}</p>
        </Card.Content>
      </Card.Root>
    </div>
  {:else if allTeams.length === 0}
    <EmptyState
      icon={IconUserFilled}
      title="No teams found"
      subtitle="No teams have registered yet"
      class="flex-1"
    />
  {:else}
    <ScrollArea
      bind:viewportRef={scroll.state.viewportRef}
      class="min-h-0 flex-1"
      fadeSize={64}
      fadeColor="background-l0"
    >
      <div class="mx-auto max-w-4xl">
        <VirtualList
          virtualItems={scroll.virtualItems}
          totalSize={scroll.totalSize}
          items={allTeams}
          hasNextPage={usersQuery.hasNextPage}
          class="mx-4 mt-4 md:mx-9"
        >
          {#snippet children({ item: team })}
            {@const isCopying = copyingTeamId === team.id}
            {@const isUpdating = updatingTeamId === team.id}
            {@const isDeleting = deletingTeamId === team.id}
            {@const isAdmin = team.perms > 0}
            <ChallengeDetailsSolvesRow
              name={team.name}
              userId={team.id}
              avatarUrl={team.avatarUrl}
              subtitle={team.email
                ? `${team.email} - Registered ${formatLocalTime(new Date(team.createdAt).getTime())}`
                : `No email - Registered ${formatLocalTime(new Date(team.createdAt).getTime())}`}
              primaryValue={team.banned ? 'Banned' : `${team.score.toLocaleString()} pts`}
              secondaryValue="{team.solveCount} solve{team.solveCount !== 1 ? 's' : ''}"
              class={team.banned ? 'opacity-75' : undefined}
            >
              {#snippet actions()}
                {#if hasWritePerms}
                  {#if isAdmin}
                    <Tooltip.Root>
                      <Tooltip.Trigger class="ml-2 self-stretch">
                        <div class="bg-background-accent flex h-full items-center rounded-lg px-3">
                          <IconShieldFilled class="text-foreground-accent size-5" />
                        </div>
                      </Tooltip.Trigger>
                      <Tooltip.Content>Admin account</Tooltip.Content>
                    </Tooltip.Root>
                  {:else}
                    <div class="ml-2 flex self-stretch sm:hidden">
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger class="h-full">
                          <Button variant="secondary" class="h-full px-3">
                            <IconDots class="size-5" />
                          </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content align="end" class="bg-background-l4 w-48 border-none">
                          {#if hasTeamDetailsPerms}
                            <DropdownMenu.Item
                              class="data-highlighted:bg-background-l5"
                              onclick={() => openManageTeam(team.id)}
                            >
                              Manage team
                              <IconUserCog class="ml-auto size-5" />
                            </DropdownMenu.Item>
                          {/if}
                          <DropdownMenu.Item
                            class="data-highlighted:bg-background-l5"
                            onclick={() => handleCopyToken(team)}
                            disabled={isCopying}
                          >
                            Copy new token
                            <IconCopy class="ml-auto size-5" />
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            class="data-highlighted:bg-background-l5"
                            onclick={() => handleBanAction(team)}
                            disabled={isUpdating}
                          >
                            {team.banned ? 'Unban team' : 'Ban team'}
                            <IconMoodX class="ml-auto size-5" />
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            class="text-foreground-destructive data-highlighted:bg-background-destructive data-highlighted:text-foreground-destructive"
                            onclick={() => openDeleteDialog(team)}
                            disabled={isDeleting}
                          >
                            Delete team
                            <IconTrashFilled class="ml-auto size-5" />
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Root>
                    </div>
                    <div class="ml-2 hidden gap-1 self-stretch sm:flex">
                      {#if hasTeamDetailsPerms}
                        <Tooltip.Root>
                          <Tooltip.Trigger class="h-full">
                            <Button
                              variant="secondary"
                              class="h-full px-3"
                              onclick={() => openManageTeam(team.id)}
                            >
                              <IconUserCog class="size-5" />
                            </Button>
                          </Tooltip.Trigger>
                          <Tooltip.Content>Manage team</Tooltip.Content>
                        </Tooltip.Root>
                      {/if}
                      <Tooltip.Root>
                        <Tooltip.Trigger class="h-full">
                          <Button
                            variant="secondary"
                            class="h-full px-3"
                            onclick={() => handleCopyToken(team)}
                            disabled={isCopying}
                          >
                            {#if isCopying}
                              <Spinner class="size-5" />
                            {:else}
                              <IconCopy class="size-5" />
                            {/if}
                          </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>Copy new token</Tooltip.Content>
                      </Tooltip.Root>
                      <Tooltip.Root>
                        <Tooltip.Trigger class="h-full">
                          <Button
                            variant={team.banned ? 'secondary' : 'destructive'}
                            class="h-full px-3"
                            onclick={() => handleBanAction(team)}
                            disabled={isUpdating}
                          >
                            {#if isUpdating}
                              <Spinner class="size-5" />
                            {:else}
                              <IconMoodX class="size-5" />
                            {/if}
                          </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>{team.banned ? 'Unban team' : 'Ban team'}</Tooltip.Content>
                      </Tooltip.Root>
                      <Tooltip.Root>
                        <Tooltip.Trigger class="h-full">
                          <Button
                            variant="destructive"
                            class="h-full px-3"
                            onclick={() => openDeleteDialog(team)}
                            disabled={isDeleting}
                          >
                            {#if isDeleting}
                              <Spinner class="size-5" />
                            {:else}
                              <IconTrashFilled class="size-5" />
                            {/if}
                          </Button>
                        </Tooltip.Trigger>
                        <Tooltip.Content>Delete team</Tooltip.Content>
                      </Tooltip.Root>
                    </div>
                  {/if}
                {/if}
              {/snippet}
            </ChallengeDetailsSolvesRow>
          {/snippet}
        </VirtualList>
      </div>
    </ScrollArea>
  {/if}
</div>

<Dialog.Root open={selectedTeamId !== null} onOpenChange={open => !open && closeManageTeam()}>
  <Dialog.Content class="flex max-h-[min(720px,calc(100dvh-48px))] max-w-2xl flex-col">
    <Dialog.Header>
      <Dialog.Title>{selectedTeam?.name ?? 'Team'}</Dialog.Title>
      <Dialog.Description>
        {#if selectedTeam}
          {selectedTeam.email ?? 'No email'} - Registered {formatLocalTime(
            new Date(selectedTeam.createdAt).getTime()
          )}
        {:else}
          Loading team details
        {/if}
      </Dialog.Description>
    </Dialog.Header>

    {#if selectedTeamQuery.isPending}
      <div class="flex min-h-48 items-center justify-center">
        <Spinner class="size-6" />
      </div>
    {:else if selectedTeamQuery.error}
      <div class="text-foreground-l3 py-8 text-center">{selectedTeamQuery.error.message}</div>
    {:else if selectedTeam}
      <div class="grid gap-2 sm:grid-cols-3">
        <div class="bg-background-l2 rounded-lg p-3">
          <div class="text-foreground-l3 text-sm">Score</div>
          <div class="text-foreground-l1 text-xl tabular-nums">
            {selectedTeam.score.toLocaleString()}
          </div>
        </div>
        <div class="bg-background-l2 rounded-lg p-3">
          <div class="text-foreground-l3 text-sm">Solves</div>
          <div class="text-foreground-l1 text-xl tabular-nums">{selectedTeam.solveCount}</div>
        </div>
        <div class="bg-background-l2 rounded-lg p-3">
          <div class="text-foreground-l3 text-sm">Status</div>
          <div class="text-foreground-l1 text-xl">{selectedTeam.banned ? 'Banned' : 'Active'}</div>
        </div>
      </div>

      <div class="mt-4 min-h-0 flex-1">
        <div class="text-foreground-l1 mb-2 flex items-center gap-2 text-sm font-medium">
          <IconTrophyFilled class="size-4" />
          Solves
        </div>

        {#if selectedTeam.solves.length === 0}
          <div class="bg-background-l2 text-foreground-l3 rounded-lg py-10 text-center">
            No solves yet
          </div>
        {:else}
          <ScrollArea class="max-h-80" fadeSize={48} fadeColor="background-l1">
            <div class="flex flex-col gap-2 pr-3">
              {#each selectedTeam.solves as solve (solve.challengeId)}
                {@const revokeKey = `${selectedTeam.id}:${solve.challengeId}`}
                <div class="bg-background-l2 flex items-center gap-3 rounded-lg p-3">
                  <div class="min-w-0 flex-1">
                    <div class="text-foreground-l1 truncate text-sm font-medium">
                      {solve.challengeName}
                    </div>
                    <div class="text-foreground-l3 truncate text-sm">
                      {solve.challengeCategory} - {formatLocalTime(
                        new Date(solve.createdAt).getTime()
                      )}
                    </div>
                  </div>
                  {#if hasSolveWritePerms}
                    <Button
                      variant="destructive"
                      size="sm"
                      onclick={() => handleRevokeSolve(solve)}
                      disabled={revokingSolveKey === revokeKey}
                    >
                      {#if revokingSolveKey === revokeKey}
                        <Spinner class="size-4" />
                      {:else}
                        <IconTrashFilled class="size-4" />
                      {/if}
                      Revoke
                    </Button>
                  {/if}
                </div>
              {/each}
            </div>
          </ScrollArea>
        {/if}
      </div>

      <Dialog.Footer>
        <Button variant="secondary" onclick={closeManageTeam}>Close</Button>
        {#if hasWritePerms && selectedTeam.perms === 0}
          <Button
            variant={selectedTeam.banned ? 'secondary' : 'destructive'}
            onclick={() => handleBanAction(selectedTeam)}
            disabled={updatingTeamId === selectedTeam.id}
          >
            {#if updatingTeamId === selectedTeam.id}
              <Spinner class="size-4" />
            {/if}
            {selectedTeam.banned ? 'Unban team' : 'Ban team'}
          </Button>
          <Button
            variant="destructive"
            onclick={() => openDeleteDialog(selectedTeam)}
            disabled={deletingTeamId === selectedTeam.id}
          >
            {#if deletingTeamId === selectedTeam.id}
              <Spinner class="size-4" />
            {/if}
            Delete team
          </Button>
        {/if}
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root open={banDialogTeam !== null} onOpenChange={open => !open && closeBanDialog()}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>Ban team</Dialog.Title>
      <Dialog.Description>
        Are you sure you want to ban <span class="text-foreground-l1 font-medium"
          >{banDialogTeam?.name}</span
        >? This removes the team from the leaderboard but keeps their account and solve history.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="secondary" onclick={closeBanDialog}>Cancel</Button>
      <Button
        variant="destructive"
        onclick={handleConfirmBan}
        disabled={banDialogTeam ? updatingTeamId === banDialogTeam.id : false}
      >
        {#if banDialogTeam && updatingTeamId === banDialogTeam.id}
          <Spinner class="size-4" />
        {/if}
        Ban team
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<Dialog.Root open={deleteDialogTeam !== null} onOpenChange={open => !open && closeDeleteDialog()}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>Delete team</Dialog.Title>
      <Dialog.Description>
        Are you sure you want to delete <span class="text-foreground-l1 font-medium"
          >{deleteDialogTeam?.name}</span
        >? This removes the team and its solves from the database.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="secondary" onclick={closeDeleteDialog}>Cancel</Button>
      <Button
        variant="destructive"
        onclick={handleDeleteTeam}
        disabled={deleteDialogTeam ? deletingTeamId === deleteDialogTeam.id : false}
      >
        {#if deleteDialogTeam && deletingTeamId === deleteDialogTeam.id}
          <Spinner class="size-4" />
        {/if}
        Delete team
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

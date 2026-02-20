<script lang="ts">
  import { GoodCreateUserTokenV2, Permissions } from '@rctf/types'
  import { showApiError, toast } from '$lib'
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
  import { IconCopy, IconDots, IconShieldFilled, IconUserFilled } from '$lib/icons'
  import {
    useClientConfig,
    useCreateUserTokenMutation,
    useCurrentUser,
    useInfiniteAdminUsers,
  } from '$lib/query'
  import { formatLocalTime, hasPermissions, useInfiniteVirtualScroll } from '$lib/utils'
  import ChallengeDetailsSolvesRow from '../../challenges/challenge-details-solves-row.svelte'

  const ROW_HEIGHT = 68
  const PAGE_SIZE = 100

  const clientConfigQuery = useClientConfig()
  const clientConfig = $derived(clientConfigQuery.data)
  const userQuery = useCurrentUser()
  const user = $derived(userQuery.data)
  const hasWritePerms = $derived(hasPermissions(user, Permissions.usersWrite))

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

  let copyingTeamId = $state<string | null>(null)

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
</script>

<svelte:head>
  {#if clientConfig}
    <title>Teams | {clientConfig.ctfName}</title>
  {/if}
</svelte:head>

<div class="flex h-[calc(100vh-72px)] flex-col">
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
            {@const isAdmin = team.perms > 0}
            <ChallengeDetailsSolvesRow
              name={team.name}
              userId={team.id}
              avatarUrl={team.avatarUrl}
              subtitle="Registered {formatLocalTime(new Date(team.createdAt).getTime())}"
              primaryValue="{team.score.toLocaleString()} pts"
              secondaryValue="{team.solveCount} solve{team.solveCount !== 1 ? 's' : ''}"
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
                          <DropdownMenu.Item
                            class="data-highlighted:bg-background-l5"
                            onclick={() => handleCopyToken(team)}
                            disabled={isCopying}
                          >
                            Copy new token
                            <IconCopy class="ml-auto size-5" />
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Root>
                    </div>
                    <div class="ml-2 hidden gap-1 self-stretch sm:flex">
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

<script lang="ts">
  import { GoodChallengeSolveDeleteV2, Permissions } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { showApiError } from '$lib/api'
  import { Button, Dialog, EmptyState, ScrollArea, Spinner, VirtualList } from '$lib/components'
  import { IconTrashFilled, IconTrophyFilled } from '$lib/icons'
  import {
    queryKeys,
    useClientConfig,
    useCurrentUser,
    useDeleteChallengeSolveMutation,
    useInfiniteChallengeSolves,
  } from '$lib/query'
  import {
    formatFirstBloodTime,
    formatLocalTime,
    formatRelativeToFirstBlood,
    getRankVariant,
    hasPermissions,
    useInfiniteVirtualScroll,
  } from '$lib/utils'
  import { toast } from 'svelte-sonner'
  import ChallengeDetailsSolvesRow from '../../challenges/challenges-details-row.svelte'

  const ROW_HEIGHT = 68

  interface Props {
    challengeId: string | null
    totalSolves: number
  }

  let { challengeId, totalSolves }: Props = $props()

  const queryClient = useQueryClient()
  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()
  const deleteMutation = useDeleteChallengeSolveMutation()

  const user = $derived(userQuery.data)
  const clientConfig = $derived(clientConfigQuery.data)
  const hasSolveWritePerms = $derived(hasPermissions(user, Permissions.challsSolveWrite))
  const showDivision = $derived(
    clientConfig ? Object.keys(clientConfig.divisions).length > 1 : true
  )

  const ctfStartTime = $derived(clientConfig?.startTime ?? 0)

  const solvesQuery = useInfiniteChallengeSolves(
    () => challengeId,
    () => totalSolves
  )
  const allSolves = $derived(solvesQuery.data?.pages.flatMap(page => page.solves) ?? [])
  const firstBloodTime = $derived(allSolves[0]?.createdAt ?? 0)

  const scroll = useInfiniteVirtualScroll({
    rowHeight: ROW_HEIGHT,
    overscan: 10,
    onLoadMore: () => solvesQuery.fetchNextPage(),
  })

  $effect(() => {
    scroll.state.count = solvesQuery.hasNextPage ? allSolves.length + 1 : allSolves.length
    scroll.state.hasNextPage = solvesQuery.hasNextPage ?? false
    scroll.state.isFetching = solvesQuery.isFetchingNextPage ?? false
  })

  // Delete dialog state
  let showDeleteDialog = $state(false)
  let selectedSolve = $state<{ userId: string; userName: string } | null>(null)
  let isDeleting = $state(false)

  function openDeleteDialog(solve: { userId: string; userName: string }) {
    selectedSolve = solve
    showDeleteDialog = true
  }

  function closeDeleteDialog() {
    showDeleteDialog = false
    selectedSolve = null
  }

  async function handleDeleteSolve() {
    if (!selectedSolve || !challengeId) return

    isDeleting = true
    deleteMutation.mutate(
      { challengeId, userId: selectedSolve.userId },
      {
        onSuccess: response => {
          if (response.kind === GoodChallengeSolveDeleteV2.kind) {
            toast.success(`Solve deleted for ${selectedSolve!.userName}`)
            queryClient.invalidateQueries({ queryKey: ['challenges', challengeId, 'solves'] })
            queryClient.invalidateQueries({ queryKey: queryKeys.fullLeaderboard })
            closeDeleteDialog()
          } else {
            showApiError(response)
          }
          isDeleting = false
        },
        onError: err => {
          toast.error(err.message)
          isDeleting = false
        },
      }
    )
  }
</script>

{#if !challengeId}
  <EmptyState
    icon={IconTrophyFilled}
    title="No challenge selected"
    subtitle="Select a challenge to view its solves"
    class="h-full"
  />
{:else if solvesQuery.isPending}
  <div class="flex h-full items-center justify-center">
    <Spinner class="size-6" />
  </div>
{:else if totalSolves === 0}
  <EmptyState
    icon={IconTrophyFilled}
    title="No solves yet"
    subtitle="This challenge hasn't been solved"
    class="h-full"
  />
{:else}
  <div class="flex h-full flex-col">
    <ScrollArea
      bind:viewportRef={scroll.state.viewportRef}
      class="min-h-0 flex-1"
      fadeSize={64}
      fadeColor="background-l2"
    >
      <VirtualList
        virtualItems={scroll.virtualItems}
        totalSize={scroll.totalSize}
        items={allSolves}
        hasNextPage={solvesQuery.hasNextPage ?? false}
        class="mx-5 mt-4"
      >
        {#snippet children({ item: solve, index })}
          {@const solvePosition = index + 1}
          {@const variant = getRankVariant(solvePosition, false)}
          <ChallengeDetailsSolvesRow
            {variant}
            rankLabel={solvePosition}
            name={solve.userName}
            userId={solve.userId}
            avatarUrl={solve.userAvatarUrl}
            countryCode={solve.userCountryCode}
            globalPlace={solve.globalPlace}
            divisionId={showDivision ? solve.division : undefined}
            divisionPlace={showDivision ? solve.divisionPlace : undefined}
            primaryValue={solvePosition === 1
              ? formatFirstBloodTime(solve.createdAt, ctfStartTime)
              : formatRelativeToFirstBlood(solve.createdAt, firstBloodTime)}
            secondaryValue={formatLocalTime(solve.createdAt)}
          >
            {#snippet children()}
              <div class="flex items-center gap-3">
                <div class="flex flex-col items-end">
                  <span class="text-foreground-l1 text-lg tabular-nums sm:text-xl">
                    {solvePosition === 1
                      ? formatFirstBloodTime(solve.createdAt, ctfStartTime)
                      : formatRelativeToFirstBlood(solve.createdAt, firstBloodTime)}
                  </span>
                  <span class="text-foreground-l3 text-sm sm:text-base">
                    {formatLocalTime(solve.createdAt)}
                  </span>
                </div>
                {#if hasSolveWritePerms}
                  <Button variant="destructive" size="sm" onclick={() => openDeleteDialog(solve)}>
                    <IconTrashFilled class="size-4" />
                  </Button>
                {/if}
              </div>
            {/snippet}
          </ChallengeDetailsSolvesRow>
        {/snippet}
      </VirtualList>
    </ScrollArea>
  </div>
{/if}

<Dialog.Root bind:open={showDeleteDialog}>
  <Dialog.Content class="max-w-md">
    <Dialog.Header>
      <Dialog.Title>Delete solve</Dialog.Title>
      <Dialog.Description>
        Are you sure you want to delete the solve for <span class="text-foreground-l1 font-medium"
          >{selectedSolve?.userName}</span
        >? This action cannot be undone and will affect the leaderboard.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button variant="secondary" onclick={closeDeleteDialog}>Cancel</Button>
      <Button variant="destructive" onclick={handleDeleteSolve} disabled={isDeleting}>
        {#if isDeleting}
          <Spinner class="size-4" />
        {/if}
        Delete solve
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

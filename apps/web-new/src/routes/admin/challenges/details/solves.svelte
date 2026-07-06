<script lang="ts">
  import { DeleteChallengeSolveRouteV2, GoodChallengeSolveDeleteV2, Permissions } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { apiRequest, showApiError } from '$lib/api'
  import { captureElement } from '$lib/attachments/capture-element'
  import EdgeFades from '$lib/components/edge-fades.svelte'
  import { createScrollGeometry, deriveEdgeFades } from '$lib/components/scroll-geometry.svelte'
  import IconTrashFilled from '$lib/icons/icon-trash-filled.svelte'
  import IconTrophyFilled from '$lib/icons/icon-trophy-filled.svelte'
  import { useChallengeSolvesInfinite } from '$lib/query/challenges'
  import { useClientConfig } from '$lib/query/config'
  import { queryKeys } from '$lib/query/keys'
  import { useCurrentUser } from '$lib/query/user'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import EmptyState from '$lib/ui/empty-state.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { hasPermissions } from '$lib/utils/permissions'
  import type { Attachment } from 'svelte/attachments'
  import ChallengeDetailsRow from '../../../challenges/details/details-row.svelte'
  import { rankVariant, solveTimeLabels } from '../../../challenges/model/solve-times'
  import ConfirmDialog from '../../profile/confirm-dialog.svelte'

  interface Props {
    challengeId: string | null
    totalSolves: number
  }

  let { challengeId, totalSolves }: Props = $props()

  const queryClient = useQueryClient()
  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()
  const solvesQuery = useChallengeSolvesInfinite(
    () => challengeId,
    () => totalSolves
  )

  const revealAfterLoading = solvesQuery.isPending

  const canRevoke = $derived(hasPermissions(userQuery.data, Permissions.challsSolveWrite))
  const clientConfig = $derived(clientConfigQuery.data)
  const ctfStartTime = $derived(clientConfig?.startTime ?? 0)
  const showDivision = $derived(
    clientConfig ? Object.keys(clientConfig.divisions).length > 1 : true
  )

  const allSolves = $derived(solvesQuery.data?.pages.flatMap(page => page.solves) ?? [])
  const firstBloodTime = $derived(allSolves[0]?.createdAt ?? 0)

  let scrollRoot = $state<HTMLElement | null>(null)
  const captureScroll = captureElement<HTMLElement>(node => (scrollRoot = node))
  const geometry = createScrollGeometry(() => scrollRoot)
  const fades = deriveEdgeFades(geometry)

  const loadMore: Attachment<HTMLElement> = node => {
    const root = scrollRoot
    if (!root) return
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting && solvesQuery.hasNextPage && !solvesQuery.isFetchingNextPage) {
            solvesQuery.fetchNextPage()
          }
        }
      },
      { root, rootMargin: '200px 0px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }

  let revokeTarget = $state<{ userId: string; userName: string } | null>(null)
  let revokingUserId = $state<string | null>(null)

  function requestRevoke(solve: { userId: string; userName: string }) {
    revokeTarget = { userId: solve.userId, userName: solve.userName }
  }

  async function confirmRevoke() {
    const target = revokeTarget
    revokeTarget = null
    if (!target || !challengeId) return
    const id = challengeId

    revokingUserId = target.userId
    try {
      const response = await apiRequest(DeleteChallengeSolveRouteV2, {
        challengeId: id,
        userId: target.userId,
      })
      if (response.kind === GoodChallengeSolveDeleteV2.kind) {
        toast.success(`Revoked ${target.userName}'s solve.`)
        queryClient.invalidateQueries({ queryKey: queryKeys.challengeSolvesInfinite(id) })
        queryClient.invalidateQueries({ queryKey: queryKeys.challenges })
        queryClient.invalidateQueries({ queryKey: queryKeys.fullLeaderboard })
      } else {
        showApiError(response)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke solve')
    } finally {
      revokingUserId = null
    }
  }

  $effect(() => {
    if (solvesQuery.isError) {
      toast.error(solvesQuery.error?.message ?? 'Failed to load solves')
    }
  })
</script>

<solves>
  {#if !challengeId}
    <EmptyState
      icon={IconTrophyFilled}
      title="No challenge selected"
      subtitle="Select a challenge to view its solves."
    />
  {:else if solvesQuery.isPending}
    <solves-status><Spinner label="Loading solves" /></solves-status>
  {:else if totalSolves === 0}
    <EmptyState
      icon={IconTrophyFilled}
      title="No solves yet"
      subtitle="This challenge has not been solved yet."
    />
  {:else}
    <solves-viewport data-reveal={revealAfterLoading || undefined}>
      <solves-scroll {@attach captureScroll} tabindex="-1">
        <solves-list>
          {#each allSolves as solve, index (solve.id)}
            {@const rank = index + 1}
            {@const labels = solveTimeLabels({
              createdAt: solve.createdAt,
              rank,
              ctfStartTime,
              firstBloodTime,
            })}
            <row-slot>
              <ChallengeDetailsRow
                variant={rankVariant(rank, false)}
                {rank}
                name={solve.userName}
                userId={solve.userId}
                avatarUrl={solve.userAvatarUrl}
                countryCode={solve.userCountryCode}
                globalPlace={solve.globalPlace}
                division={showDivision ? solve.division : null}
                divisionPlace={showDivision ? solve.divisionPlace : null}
              >
                <solve-trailing>
                  <solve-time>
                    <span data-part="primary">{labels.primary}</span>
                    <span data-part="secondary">{labels.secondary}</span>
                  </solve-time>
                  {#if canRevoke}
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      aria-label="Revoke {solve.userName}'s solve"
                      disabled={revokingUserId !== null}
                      onclick={() => requestRevoke(solve)}
                    >
                      {#if revokingUserId === solve.userId}<Spinner />{:else}<IconTrashFilled
                        />{/if}
                    </Button>
                  {/if}
                </solve-trailing>
              </ChallengeDetailsRow>
            </row-slot>
          {/each}

          {#if solvesQuery.isFetchingNextPage}
            <solves-loading><Spinner label="Loading more solves" /></solves-loading>
          {/if}

          <solves-sentinel {@attach loadMore}></solves-sentinel>
        </solves-list>
      </solves-scroll>

      <EdgeFades top={fades.top} bottom={fades.bottom} />
    </solves-viewport>
  {/if}
</solves>

<ConfirmDialog
  open={revokeTarget !== null}
  onOpenChange={open => {
    if (!open) revokeTarget = null
  }}
  title="Revoke solve"
  message={`Revoking ${revokeTarget?.userName ?? 'this team'}'s solve cannot be undone and will affect the leaderboard.`}
  confirmLabel="Revoke solve"
  destructive
  onConfirm={confirmRevoke}
/>

<style>
  solves {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
  }

  solves-status {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    font-size: var(--step-1);
    color: var(--foreground-l3);
  }

  solves-viewport {
    position: relative;
    flex: 1;
    min-block-size: 0;
  }

  solves-scroll {
    display: block;
    block-size: 100%;
    overflow-y: auto;
    outline: none;
  }

  solves-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    padding: 1rem 1.25rem;
  }

  row-slot {
    display: block;
    content-visibility: auto;
    contain-intrinsic-size: auto 4rem;
  }

  solve-trailing {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
  }

  solve-time {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    text-align: end;
  }

  [data-part='primary'] {
    font-size: 1.125rem;
    font-variant-numeric: tabular-nums;
    color: var(--foreground-l1);
    white-space: nowrap;

    @media (width >= 40rem) {
      font-size: 1.25rem;
    }
  }

  [data-part='secondary'] {
    font-size: 0.875rem;
    color: var(--foreground-l3);
    white-space: nowrap;

    @media (width >= 40rem) {
      font-size: 1rem;
    }
  }

  solves-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    block-size: 4rem;
    font-size: var(--step-1);
    color: var(--foreground-l3);
  }

  solves-sentinel {
    display: block;
    block-size: 1px;
  }
</style>

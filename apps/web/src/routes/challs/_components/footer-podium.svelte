<script lang="ts">
  import type { Challenge, Solve as UserSolve } from '$lib/api'
  import { Avatar } from '$lib/components'
  import { useChallengeSolves, useClientConfig, useCurrentUser } from '$lib/query'
  import type { RankVariant } from '$lib/utils'
  import {
    cn,
    formatFirstBloodTime,
    formatRelativeToFirstBlood,
    getInitials,
    getOrdinal,
    getRankStyles,
  } from '$lib/utils'

  interface Props {
    challenge: Challenge
    isSolved: boolean
  }

  let { challenge, isSolved }: Props = $props()

  const solvesQuery = $derived(useChallengeSolves(challenge.id, { limit: 10, offset: 0 }))
  const topSolves = $derived($solvesQuery.data?.solves.slice(0, 3) ?? [])

  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()

  const currentUser = $derived($userQuery.data)
  const clientConfig = $derived($clientConfigQuery.data)
  const ctfStartTime = $derived(clientConfig?.startTime ?? 0)
  const currentUserSolve = $derived(
    currentUser?.solves.find((s: UserSolve) => s.id === challenge.id)
  )

  const placementVariants: RankVariant[] = ['first', 'second', 'third', 'self']

  const firstBloodTime = $derived(topSolves[0]?.createdAt ?? 0)
</script>

{#if challenge.solves && challenge.solves > 0}
  <div class="grid grid-cols-4 gap-2">
    {#each placementVariants as variant, index}
      {@const style = getRankStyles(variant)}
      {@const isUserSlot = index === 3}
      {@const solve = isUserSlot ? null : topSolves[index]}
      {@const showUserSolve = isUserSlot && isSolved && currentUserSolve}
      {@const hasContent = solve || showUserSolve}
      {@const showEmpty = !hasContent}
      <div
        class={cn(
          'flex h-14 items-center justify-between gap-2 rounded-lg py-1.5 pr-1.5 pl-2',
          showEmpty ? 'border-2 border-dashed' : style.bg
        )}>
        {#if !showEmpty}
          <span class={cn('text-base font-medium', style.fgL0)}>
            {isUserSlot ? 'You' : getOrdinal(index + 1)}
          </span>
        {/if}
        {#if solve}
          <div class="flex min-w-0 items-center gap-2">
            <div class="flex min-w-0 flex-col items-end">
              <span class={cn('w-full truncate text-right text-base', style.fgL0)}>
                {solve.userName}
              </span>
              <span class={cn('w-full truncate text-right text-sm', style.fgL1)}>
                {index === 0
                  ? formatFirstBloodTime(solve.createdAt, ctfStartTime)
                  : formatRelativeToFirstBlood(solve.createdAt, firstBloodTime)}
              </span>
            </div>
            <Avatar.Root class="size-11 shrink-0 rounded-md text-sm">
              {#if solve.userAvatarUrl}
                <Avatar.Image src={solve.userAvatarUrl} alt={solve.userName} class="rounded-md" />
              {/if}
              <Avatar.Fallback class="rounded-md">
                {getInitials(solve.userName)}
              </Avatar.Fallback>
            </Avatar.Root>
          </div>
        {:else if showUserSolve && currentUser}
          <div class="flex min-w-0 items-center gap-2">
            <div class="flex min-w-0 flex-col items-end">
              <span class={cn('w-full truncate text-right text-base', style.fgL0)}>
                {currentUser.name}
              </span>
              <span class={cn('w-full truncate text-right text-sm', style.fgL1)}>
                {formatRelativeToFirstBlood(currentUserSolve.createdAt, firstBloodTime)}
              </span>
            </div>
            <Avatar.Root class="size-11 shrink-0 rounded-md text-sm">
              {#if currentUser.avatarUrl}
                <Avatar.Image src={currentUser.avatarUrl} alt={currentUser.name} class="rounded-md" />
              {/if}
              <Avatar.Fallback class="rounded-md">
                {getInitials(currentUser.name)}
              </Avatar.Fallback>
            </Avatar.Root>
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

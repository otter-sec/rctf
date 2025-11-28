<script lang="ts">
  import type { Challenge, Solve as UserSolve } from '$lib/api'
  import { Avatar } from '$lib/components'
  import { useChallengeSolves, useCurrentUser } from '$lib/query'
  import {
    formatLocalTime,
    formatRelativeToFirstBlood,
    getInitials,
  } from '$lib/utils'

  type Props = {
    challenge: Challenge
  }

  let { challenge }: Props = $props()

  const userQuery = useCurrentUser()

  const currentUser = $derived($userQuery.data)
  const currentUserSolve = $derived(
    currentUser?.solves.find((s: UserSolve) => s.id === challenge.id)
  )

  const solvesQuery = $derived(
    useChallengeSolves(challenge.id, { limit: 1, offset: 0 })
  )
  const firstBloodTime = $derived(
    $solvesQuery.data?.solves?.[0]?.createdAt ?? 0
  )

  const formattedDivision = $derived(
    currentUser?.division
      ? currentUser.division.charAt(0).toUpperCase() +
          currentUser.division.slice(1) +
          ' Division'
      : 'Division'
  )
</script>

{#if currentUserSolve && currentUser}
  <div class="flex items-center gap-2 rounded-lg bg-background-self px-4 py-2">
    <!-- TODO(enscribe): Add solve rank -->
    <span
      class="w-[58px] text-center shrink-0 text-xl tabular-nums text-foreground-self-l0"
    >
      You
    </span>
    <Avatar.Root class="size-12 shrink-0 rounded-lg">
      <Avatar.Fallback class="rounded-lg text-sm">
        {getInitials(currentUser.name)}
      </Avatar.Fallback>
    </Avatar.Root>
    <div class="flex min-w-0 flex-1 flex-col">
      <span class="truncate text-xl text-foreground-self-l0">
        {currentUser.name}
      </span>
      <span class="truncate text-base text-foreground-self-l1">
        <!-- TODO(enscribe): Add overall division rank (BREAKING CHANGE) -->
        {formattedDivision}
      </span>
    </div>
    <div class="flex shrink-0 flex-col items-end">
      <span class="text-xl tabular-nums text-foreground-self-l0">
        {formatRelativeToFirstBlood(currentUserSolve.createdAt, firstBloodTime)}
      </span>
      <span class="text-base text-foreground-self-l1">
        {formatLocalTime(currentUserSolve.createdAt)}
      </span>
    </div>
  </div>
{/if}

<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query'
  import { toast } from '$lib'
  import { Avatar, Spinner, Tooltip } from '$lib/components'
  import {
    IconChevronLeft,
    IconChevronLeftPipe,
    IconChevronRight,
    IconChevronRightPipe,
    IconCircle,
    IconCircleDashed,
  } from '$lib/icons'
  import {
    leaderboardQueryOptions,
    useCurrentUser,
    useLeaderboard,
  } from '$lib/query'
  import { cn, getInitials, getRankStylesForPosition } from '$lib/utils'
  import {
    getCategoryConfig,
    getCategoryOrder,
    getCategoryStyle,
  } from '$lib/utils/categories'

  const PAGE_SIZE = 10
  const TEAM_COL_WIDTH = 548
  const CELL_WIDTH = 48

  const queryClient = useQueryClient()
  const userQuery = useCurrentUser()

  let page = $state(1)

  const leaderboardQuery = $derived(
    useLeaderboard({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      division: 'open',
    })
  )

  const data = $derived($leaderboardQuery.data)
  const entries = $derived(data?.leaderboard ?? [])
  const totalPages = $derived(Math.ceil((data?.total ?? 0) / PAGE_SIZE))
  const isRefetching = $derived(
    $leaderboardQuery.isFetching && !$leaderboardQuery.isPending
  )

  const challenges = $derived.by(() => {
    if (!data?.challenges) return []

    return Object.entries(data.challenges)
      .map(([id, info]) => {
        const config = getCategoryConfig(info.category)
        return {
          id,
          ...info,
          order: getCategoryOrder(info.category),
          config,
        }
      })
      .sort((a, b) => {
        if (a.order !== b.order) {
          if (a.order === -1 && b.order === -1)
            return a.category.localeCompare(b.category)
          if (a.order === -1) return 1
          if (b.order === -1) return -1
          return a.order - b.order
        }
        if (a.category !== b.category)
          return a.category.localeCompare(b.category)
        return b.points - a.points || a.name.localeCompare(b.name)
      })
  })

  const categoryGroups = $derived.by(() => {
    const groups: Array<{
      category: string
      config: ReturnType<typeof getCategoryConfig>
      challenges: typeof challenges
    }> = []

    for (const challenge of challenges) {
      const last = groups.at(-1)
      if (last?.category === challenge.category) {
        last.challenges.push(challenge)
      } else {
        groups.push({
          category: challenge.category,
          config: challenge.config,
          challenges: [challenge],
        })
      }
    }
    return groups
  })

  const solvesByTeam = $derived(
    new Map(entries.map(e => [e.id, new Set(e.solves)]))
  )

  function handlePageChange(newPage: number) {
    page = newPage
  }

  $effect(() => {
    for (const p of [page - 1, page + 1]) {
      if (p >= 1 && p <= totalPages) {
        queryClient.prefetchQuery(
          leaderboardQueryOptions({
            limit: PAGE_SIZE,
            offset: (p - 1) * PAGE_SIZE,
            division: 'open',
          })
        )
      }
    }
  })

  $effect(() => {
    if ($leaderboardQuery.isError) {
      toast.error(
        $leaderboardQuery.error?.message ?? 'Failed to load leaderboard'
      )
    }
  })
</script>

<div class="flex flex-col px-9">
  <div class="flex items-center justify-end gap-1 py-2">
    <div
      class="flex h-10 items-center whitespace-nowrap px-3 text-sm text-foreground-l3"
    >
      Page {page} / {totalPages || 1}
    </div>
    <div class="flex h-10 gap-1 overflow-hidden rounded-lg">
      <Tooltip.Root disableCloseOnTriggerClick>
        <Tooltip.Trigger
          onclick={() => handlePageChange(1)}
          disabled={isRefetching || page === 1}
          class="h-10 rounded-r-sm bg-background-l2 px-3 text-foreground-l2 hover:bg-background-l3 hover:text-foreground-l1 disabled:pointer-events-none disabled:opacity-50"
        >
          <IconChevronLeftPipe class="size-5" />
        </Tooltip.Trigger>
        <Tooltip.Content>First page</Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root disableCloseOnTriggerClick>
        <Tooltip.Trigger
          onclick={() => handlePageChange(Math.max(1, page - 1))}
          disabled={isRefetching || page === 1}
          class="h-10 rounded-sm bg-background-l2 px-3 text-foreground-l2 hover:bg-background-l3 hover:text-foreground-l1 disabled:pointer-events-none disabled:opacity-50"
        >
          <IconChevronLeft class="size-5" />
        </Tooltip.Trigger>
        <Tooltip.Content>Previous page</Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root disableCloseOnTriggerClick>
        <Tooltip.Trigger
          onclick={() => handlePageChange(Math.min(totalPages || 1, page + 1))}
          disabled={isRefetching || page === totalPages}
          class="h-10 rounded-sm bg-background-l2 px-3 text-foreground-l2 hover:bg-background-l3 hover:text-foreground-l1 disabled:pointer-events-none disabled:opacity-50"
        >
          <IconChevronRight class="size-5" />
        </Tooltip.Trigger>
        <Tooltip.Content>Next page</Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root disableCloseOnTriggerClick>
        <Tooltip.Trigger
          onclick={() => handlePageChange(totalPages || 1)}
          disabled={isRefetching || page === totalPages}
          class="h-10 rounded-l-sm bg-background-l2 px-3 text-foreground-l2 hover:bg-background-l3 hover:text-foreground-l1 disabled:pointer-events-none disabled:opacity-50"
        >
          <IconChevronRightPipe class="size-5" />
        </Tooltip.Trigger>
        <Tooltip.Content>Last page</Tooltip.Content>
      </Tooltip.Root>
    </div>
  </div>

  <div class={cn('relative', $leaderboardQuery.isFetching && 'opacity-50')}>
    {#if $leaderboardQuery.isLoading}
      <div
        class="absolute inset-0 z-30 flex items-center justify-center bg-background/60"
      >
        <Spinner class="size-6" />
      </div>
    {/if}

    <div
      class="max-h-[calc(100vh-128px)] overflow-auto overscroll-none rounded-lg"
    >
      <div class="sticky top-0 z-20 flex w-max bg-background-l0">
        <div
          class="sticky left-0 z-30 shrink-0 bg-background-l0"
          style:width="{TEAM_COL_WIDTH}px"
        ></div>

        <div class="flex items-stretch">
          {#each categoryGroups as group, i}
            {@const Icon = group.config.icon}
            {@const showLabel = group.challenges.length > 1}
            <div
              class={cn(
                'relative flex flex-col rounded-t-lg bg-category-background-l0',
                'before:absolute before:inset-0 before:-z-10 before:rounded-t-lg before:bg-background-l0',
                i < categoryGroups.length - 1 && 'mr-1'
              )}
              style={getCategoryStyle(group.config.color)}
            >
              <div class="flex py-1.5">
                {#each group.challenges as challenge}
                  <Tooltip.Root>
                    <Tooltip.Trigger
                      class="flex w-12 items-center justify-center"
                    >
                      <span
                        class="flex size-5 items-center justify-center rounded bg-category-background-l1 text-sm leading-none text-category-foreground-l1 opacity-75"
                      >
                        {challenge.points}
                      </span>
                    </Tooltip.Trigger>
                    <Tooltip.Content side="bottom" sideOffset={4}>
                      <p>{challenge.name}</p>
                      <p class="text-foreground-l3">
                        {challenge.points} pts · {challenge.solves} solve{challenge.solves !==
                        1
                          ? 's'
                          : ''}
                      </p>
                    </Tooltip.Content>
                  </Tooltip.Root>
                {/each}
              </div>

              <div
                class="flex items-center justify-center gap-1 overflow-hidden px-2 pb-1.5"
                style:max-width="{group.challenges.length * CELL_WIDTH}px"
              >
                {#if showLabel}
                  <Icon class="size-5 shrink-0 text-category-foreground-l1" />
                  <span class="truncate capitalize text-category-foreground-l1"
                    >{group.config.name}</span
                  >
                {:else}
                  <Tooltip.Root>
                    <Tooltip.Trigger
                      class="flex items-center justify-center text-category-foreground-l1"
                    >
                      <Icon class="mt-0.5 size-5" />
                    </Tooltip.Trigger>
                    <Tooltip.Content side="bottom" sideOffset={4}>
                      <span class="capitalize">{group.config.name}</span>
                    </Tooltip.Content>
                  </Tooltip.Root>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <div class="flex flex-col gap-1">
        {#each entries as entry, index (entry.id)}
          {@const rank = (page - 1) * PAGE_SIZE + index + 1}
          {@const styles = getRankStylesForPosition(
            rank,
            $userQuery.data?.id === entry.id
          )}
          {@const solves = solvesByTeam.get(entry.id)!}

          <div class="flex w-max rounded-lg bg-background-l2">
            <div
              class={cn(
                'sticky left-0 z-10 flex h-16 shrink-0 items-center gap-3 rounded-l-lg px-4',
                styles.bg,
                'before:absolute before:inset-0 before:-z-10 before:rounded-l-lg before:bg-background-l2',
                styles.gradient && [
                  'after:absolute after:rounded-l-lg after:inset-y-0 after:left-0 after:-z-10 after:w-96 after:bg-linear-to-r after:to-transparent',
                  styles.gradient,
                ]
              )}
              style:width="{TEAM_COL_WIDTH}px"
            >
              <span
                class={cn(
                  'w-16 shrink-0 text-center text-xl tabular-nums',
                  styles.fgL0
                )}
              >
                #{rank}
              </span>

              <Avatar.Root class="size-12 shrink-0 rounded-lg">
                {#if entry.avatarUrl}
                  <Avatar.Image
                    src={entry.avatarUrl}
                    alt={entry.name}
                    class="rounded-lg"
                  />
                {/if}
                <Avatar.Fallback class="rounded-lg text-sm"
                  >{getInitials(entry.name)}</Avatar.Fallback
                >
              </Avatar.Root>

              <div class="flex h-full w-64 shrink-0 flex-col justify-center">
                <a
                  href="/profile/{entry.id}"
                  class={cn('truncate text-xl hover:underline', styles.fgL0)}
                >
                  {entry.name}
                </a>
                <span class={cn('truncate text-base', styles.fgL1)}
                  >Open Division</span
                >
              </div>

              <div class="flex w-28 shrink-0 flex-col items-end">
                <span class="text-xl tabular-nums text-foreground-l1"
                  >{entry.score.toLocaleString()} pts</span
                >
                <span class="text-base text-foreground-l3">
                  {entry.solves.length} solve{entry.solves.length !== 1
                    ? 's'
                    : ''}
                </span>
              </div>
            </div>

            <div class="flex">
              {#each challenges as challenge, i}
                {@const solved = solves.has(challenge.id)}
                {@const prevCategory = challenges[i - 1]?.category}
                {@const nextCategory = challenges[i + 1]?.category}
                {@const isFirst =
                  i === 0 || prevCategory !== challenge.category}
                {@const isLast =
                  i === challenges.length - 1 ||
                  nextCategory !== challenge.category}
                <div
                  class={cn(
                    'flex h-16 w-12 items-center justify-center',
                    isFirst && 'rounded-l-lg',
                    isLast && i < challenges.length - 1 && 'mr-1'
                  )}
                  style={getCategoryStyle(challenge.config.color)}
                >
                  {#if solved}
                    <Tooltip.Root>
                      <Tooltip.Trigger>
                        <IconCircle class="size-7 text-category-foreground-l1" />
                      </Tooltip.Trigger>
                      <Tooltip.Content side="top" sideOffset={4}
                        >{challenge.name}</Tooltip.Content
                      >
                    </Tooltip.Root>
                  {:else}
                    <IconCircleDashed class="size-7 text-foreground-l5/25" />
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>

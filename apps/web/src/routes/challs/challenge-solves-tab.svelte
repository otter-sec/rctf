<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query'
  import { toast } from '$lib'
  import type { Challenge } from '$lib/api'
  import { Pagination, ScrollArea, Spinner } from '$lib/components'
  import { challengeSolvesQueryOptions, useChallengeSolves } from '$lib/query'

  const PAGE_SIZE = 15

  type Props = {
    challenge: Challenge
  }

  let { challenge }: Props = $props()

  const queryClient = useQueryClient()

  let page = $state(1)

  const solvesQuery = $derived(
    useChallengeSolves(challenge.id, {
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    })
  )

  const solves = $derived($solvesQuery.data?.solves ?? [])
  const totalCount = $derived(challenge.solves ?? 0)
  const totalPages = $derived(Math.ceil(totalCount / PAGE_SIZE))
  const isRefetching = $derived(
    $solvesQuery.isFetching && !$solvesQuery.isPending
  )

  function handlePageChange(newPage: number) {
    page = newPage
  }

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString()
  }

  $effect(() => {
    const prefetchPage = (targetPage: number) => {
      if (targetPage < 1 || targetPage > totalPages) return
      const params = { limit: PAGE_SIZE, offset: (targetPage - 1) * PAGE_SIZE }
      queryClient.prefetchQuery(
        challengeSolvesQueryOptions(challenge.id, params)
      )
    }

    prefetchPage(page - 1)
    prefetchPage(page + 1)
  })

  $effect(() => {
    if ($solvesQuery.isError) {
      toast.error($solvesQuery.error?.message ?? 'Failed to load solves')
    }
  })
</script>

<ScrollArea
  class="h-full px-9 pb-4 pt-2"
  fadeSize={64}
  fadeColor="background-l2"
>
  {#if $solvesQuery.isPending}
    <div class="flex items-center justify-center py-8">
      <Spinner class="size-6" />
    </div>
  {:else if totalCount === 0}
    <p class="text-foreground-l3 text-center py-8">No solves yet</p>
  {:else}
    <div class="relative min-h-[200px]">
      <ul class="flex flex-col gap-2" class:opacity-50={isRefetching}>
        {#each solves as solve, index (solve.id)}
          <li
            class="flex items-center justify-between gap-4 rounded-md border bg-background-l2 p-3"
          >
            <div class="flex items-center gap-3">
              <span class="text-foreground-l3 tabular-nums text-sm font-medium">
                #{(page - 1) * PAGE_SIZE + index + 1}
              </span>
              <a
                href="/profile/{solve.userId}"
                class="font-medium hover:underline wrap-anywhere line-clamp-1"
              >
                {solve.userName}
              </a>
            </div>
            <time
              datetime={new Date(solve.createdAt).toISOString()}
              class="text-foreground-l3 text-sm shrink-0"
            >
              {formatTime(solve.createdAt)}
            </time>
          </li>
        {/each}
      </ul>
    </div>

    {#if totalPages > 1}
      <div class="flex justify-center pt-4">
        {#key page}
          <Pagination.Root
            count={totalCount}
            perPage={PAGE_SIZE}
            {page}
            onPageChange={handlePageChange}
          >
            {#snippet children({ pages })}
              <Pagination.Content>
                <Pagination.Item>
                  <Pagination.PrevButton disabled={isRefetching} />
                </Pagination.Item>
                {#each pages as p (p.key)}
                  {#if p.type === 'ellipsis'}
                    <Pagination.Item>
                      <Pagination.Ellipsis />
                    </Pagination.Item>
                  {:else}
                    <Pagination.Item>
                      <Pagination.Link
                        page={p}
                        isActive={page === p.value}
                        disabled={isRefetching}
                      />
                    </Pagination.Item>
                  {/if}
                {/each}
                <Pagination.Item>
                  <Pagination.NextButton disabled={isRefetching} />
                </Pagination.Item>
              </Pagination.Content>
            {/snippet}
          </Pagination.Root>
        {/key}
      </div>
    {/if}
  {/if}
</ScrollArea>

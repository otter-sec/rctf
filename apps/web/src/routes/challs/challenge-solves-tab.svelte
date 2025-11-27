<script lang="ts">
  import { GetChallengeSolvesRoute, GoodChallengeSolves } from '@rctf/types'
  import { apiRequest, toast } from '$lib'
  import type { Challenge } from '$lib/api'
  import { Pagination, ScrollArea, Spinner } from '$lib/components'
  import { onMount } from 'svelte'

  const PAGE_SIZE = 15

  type Props = {
    challenge: Challenge
  }

  let { challenge }: Props = $props()

  type Solve = {
    id: string
    createdAt: number
    userId: string
    userName: string
  }

  let solves = $state<Solve[]>([])
  let page = $state(1)
  let loading = $state(true)

  const totalCount = $derived(challenge.solves ?? 0)
  const totalPages = $derived(Math.ceil(totalCount / PAGE_SIZE))

  let pendingPage = $state<number | null>(null)

  async function fetchSolves(pageNum: number) {
    if (!challenge.solves) {
      loading = false
      return
    }

    loading = true
    pendingPage = pageNum
    const offset = (pageNum - 1) * PAGE_SIZE

    const response = await apiRequest(GetChallengeSolvesRoute, {
      id: challenge.id,
      limit: PAGE_SIZE,
      offset,
    })

    if (response.kind === GoodChallengeSolves.kind) {
      solves = response.data.solves
      page = pageNum
    } else {
      toast.error(response.message)
    }
    pendingPage = null
    loading = false
  }

  function handlePageChange(newPage: number) {
    if (newPage === page || loading) return
    fetchSolves(newPage)
  }

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString()
  }

  onMount(() => {
    fetchSolves(1)
  })
</script>

<ScrollArea class="h-full px-9 pb-4 pt-2" fadeSize={64} fadeColor="background-l2">
  {#if totalCount === 0}
    <p class="text-foreground-l3 text-center py-8">No solves yet</p>
  {:else}
    <div class="relative min-h-[200px]">
      {#if loading}
        <div
          class="absolute inset-0 flex items-center justify-center bg-background/60 z-10"
        >
          <Spinner class="size-6" />
        </div>
      {/if}

      <ul class="flex flex-col gap-2" class:opacity-50={loading}>
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
        <Pagination.Root
          count={totalCount}
          perPage={PAGE_SIZE}
          page={pendingPage ?? page}
          onPageChange={handlePageChange}
        >
          {#snippet children({ pages, currentPage })}
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.PrevButton disabled={loading} />
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
                      isActive={currentPage === p.value}
                      disabled={loading}
                    />
                  </Pagination.Item>
                {/if}
              {/each}
              <Pagination.Item>
                <Pagination.NextButton disabled={loading} />
              </Pagination.Item>
            </Pagination.Content>
          {/snippet}
        </Pagination.Root>
      </div>
    {/if}
  {/if}
</ScrollArea>

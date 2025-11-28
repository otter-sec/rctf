<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query'
  import { toast } from '$lib'
  import { Pagination, Spinner, Table } from '$lib/components'
  import { leaderboardQueryOptions, useLeaderboard } from '$lib/query'

  const PAGE_SIZE = 100

  const queryClient = useQueryClient()

  let page = $state(1)

  const leaderboardQuery = $derived(
    useLeaderboard({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      division: 'open',
    })
  )

  const entries = $derived($leaderboardQuery.data?.leaderboard ?? [])
  const total = $derived($leaderboardQuery.data?.total ?? 0)

  const totalPages = $derived(Math.ceil(total / PAGE_SIZE))
  const isLoading = $derived($leaderboardQuery.isFetching)

  function handlePageChange(newPage: number) {
    page = newPage
  }

  $effect(() => {
    const prefetchPage = (targetPage: number) => {
      if (targetPage < 1 || targetPage > totalPages) return
      const params = {
        limit: PAGE_SIZE,
        offset: (targetPage - 1) * PAGE_SIZE,
        division: 'open',
      }
      queryClient.prefetchQuery(leaderboardQueryOptions(params))
    }

    prefetchPage(page - 1)
    prefetchPage(page + 1)
  })

  $effect(() => {
    if ($leaderboardQuery.isError) {
      toast.error(
        $leaderboardQuery.error?.message ?? 'Failed to load leaderboard'
      )
    }
  })
</script>

<div class="flex flex-col gap-4">
  <p class="text-foreground-l3 text-sm">
    {#if total > 0}
      Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}
      of {total} teams
    {:else}
      No teams yet
    {/if}
  </p>

  <div class="relative">
    {#if isLoading}
      <div
        class="absolute inset-0 flex items-center justify-center bg-background/60 z-10"
      >
        <Spinner class="size-6" />
      </div>
    {/if}

    <Table.Root class={isLoading ? 'opacity-50' : ''}>
      <Table.Header>
        <Table.Row>
          <Table.Head class="w-16">Rank</Table.Head>
          <Table.Head>Team</Table.Head>
          <Table.Head class="text-right">Score</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {#each entries as entry, index (entry.id)}
          <Table.Row>
            <Table.Cell class="text-foreground-l3 tabular-nums">
              #{(page - 1) * PAGE_SIZE + index + 1}
            </Table.Cell>
            <Table.Cell class="font-medium wrap-anywhere">
              <a href="/profile/{entry.id}" class="hover:underline">
                {entry.name}
              </a>
            </Table.Cell>
            <Table.Cell class="text-right tabular-nums">
              {entry.score.toLocaleString()}
            </Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>

  {#if totalPages > 1}
    {#key page}
      <Pagination.Root
        count={total}
        perPage={PAGE_SIZE}
        {page}
        onPageChange={handlePageChange}
      >
        {#snippet children({ pages })}
          <Pagination.Content>
            <Pagination.Item>
              <Pagination.PrevButton disabled={isLoading} />
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
                    disabled={isLoading}
                  />
                </Pagination.Item>
              {/if}
            {/each}
            <Pagination.Item>
              <Pagination.NextButton disabled={isLoading} />
            </Pagination.Item>
          </Pagination.Content>
        {/snippet}
      </Pagination.Root>
    {/key}
  {/if}
</div>

<script lang="ts">
  import { GetLeaderboardRoute, GoodLeaderboard } from '@rctf/types'
  import { apiRequest, toast } from '$lib'
  import type { LeaderboardEntry } from '$lib/api'
  import { Pagination, Spinner, Table } from '$lib/components'

  type Props = {
    initialEntries: LeaderboardEntry[]
    total: number
    pageSize: number
  }

  let { initialEntries, total, pageSize }: Props = $props()

  let entries = $state(initialEntries)
  let page = $state(1)
  let loading = $state(false)
  let pendingPage = $state<number | null>(null)

  const totalPages = $derived(Math.ceil(total / pageSize))

  async function fetchPage(pageNum: number) {
    loading = true
    pendingPage = pageNum

    const response = await apiRequest(GetLeaderboardRoute, {
      limit: pageSize,
      offset: (pageNum - 1) * pageSize,
      division: 'open',
    })

    if (response.kind === GoodLeaderboard.kind) {
      entries = response.data.leaderboard
      page = pageNum
    } else {
      toast.error(response.message)
    }

    pendingPage = null
    loading = false
  }

  function handlePageChange(newPage: number) {
    if (newPage === page || loading) return
    fetchPage(newPage)
  }
</script>

<div class="flex flex-col gap-4">
  <p class="text-foreground-l3 text-sm">
    Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
    of {total} teams
  </p>

  <div class="relative">
    {#if loading}
      <div
        class="absolute inset-0 flex items-center justify-center bg-background/60 z-10"
      >
        <Spinner class="size-6" />
      </div>
    {/if}

    <Table.Root class={loading ? 'opacity-50' : ''}>
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
              #{(page - 1) * pageSize + index + 1}
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
    <Pagination.Root
      count={total}
      perPage={pageSize}
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
  {/if}
</div>

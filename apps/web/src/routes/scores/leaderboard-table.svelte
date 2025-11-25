<script lang="ts">
  import { GetLeaderboardRoute, GoodLeaderboard } from '@rctf/types'
  import { apiRequest, toast } from '$lib'
  import type { LeaderboardEntry } from '$lib/api'
  import { Pagination, Spinner, Table } from '$lib/components'

  const PAGE_SIZE = 100

  let {
    entries: initialEntries,
    total,
  }: { entries: LeaderboardEntry[]; total: number } = $props()

  let entries = $state(initialEntries)
  let page = $state(1)
  let loading = $state(false)

  const totalPages = $derived(Math.ceil(total / PAGE_SIZE))

  async function fetchPage(pageNum: number) {
    loading = true
    const response = await apiRequest(GetLeaderboardRoute, {
      limit: PAGE_SIZE,
      offset: (pageNum - 1) * PAGE_SIZE,
      division: 'open',
    })

    if (response.kind === GoodLeaderboard.kind) {
      entries = response.data.leaderboard
    } else {
      toast.error(response.message)
    }
    loading = false
  }
</script>

<div class="flex flex-col gap-4">
  <p class="text-foreground-l3 text-sm">
    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
    teams
  </p>

  {#if loading}
    <div class="flex items-center justify-center py-8">
      <Spinner class="size-6" />
    </div>
  {:else}
    <Table.Root>
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
  {/if}

  {#if totalPages > 1}
    <Pagination.Root
      count={total}
      perPage={PAGE_SIZE}
      bind:page
      onPageChange={p => fetchPage(p)}
    >
      {#snippet children({ pages, currentPage })}
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.PrevButton />
          </Pagination.Item>
          {#each pages as p (p.key)}
            {#if p.type === 'ellipsis'}
              <Pagination.Item>
                <Pagination.Ellipsis />
              </Pagination.Item>
            {:else}
              <Pagination.Item>
                <Pagination.Link page={p} isActive={currentPage === p.value}>
                  {p.value}
                </Pagination.Link>
              </Pagination.Item>
            {/if}
          {/each}
          <Pagination.Item>
            <Pagination.NextButton />
          </Pagination.Item>
        </Pagination.Content>
      {/snippet}
    </Pagination.Root>
  {/if}
</div>

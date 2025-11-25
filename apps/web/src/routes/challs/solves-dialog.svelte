<script lang="ts">
  import { GetChallengeSolvesRoute, GoodChallengeSolves } from '@rctf/types'
  import { apiRequest, toast } from '$lib'
  import {
    Button,
    Dialog,
    Pagination,
    ScrollArea,
    Spinner,
  } from '$lib/components'

  const PAGE_SIZE = 10

  let {
    challengeId,
    challengeName,
    solveCount,
  }: {
    challengeId: string
    challengeName: string
    solveCount: number
  } = $props()

  let open = $state(false)
  let solves = $state<
    Array<{
      id: string
      createdAt: number
      userId: string
      userName: string
    }>
  >([])
  let page = $state(1)
  let loading = $state(false)

  const totalPages = $derived(Math.ceil(solveCount / PAGE_SIZE))

  async function fetchSolves(pageNum: number) {
    loading = true
    const response = await apiRequest(GetChallengeSolvesRoute, {
      id: challengeId,
      limit: PAGE_SIZE,
      offset: (pageNum - 1) * PAGE_SIZE,
    })

    if (response.kind === GoodChallengeSolves.kind) {
      solves = response.data.solves
    } else {
      toast.error(response.message)
    }
    loading = false
  }

  function handleOpenChange(isOpen: boolean) {
    open = isOpen
    if (isOpen && solveCount > 0) {
      fetchSolves(1)
    } else if (!isOpen) {
      solves = []
      page = 1
    }
  }

  function formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString()
  }
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
  <Dialog.Trigger>
    <Button variant="link" class="h-auto p-0" disabled={solveCount === 0}>
      {solveCount} solve{solveCount !== 1 ? 's' : ''}
    </Button>
  </Dialog.Trigger>
  <Dialog.Content class="max-h-[80vh] overflow-hidden">
    <Dialog.Header>
      <Dialog.Title>Solves for {challengeName}</Dialog.Title>
      <Dialog.Description>
        {solveCount} team{solveCount !== 1 ? 's' : ''} solved this challenge
      </Dialog.Description>
    </Dialog.Header>

    <ScrollArea class="max-h-[50vh]">
      {#if loading && solves.length === 0}
        <div class="flex items-center justify-center py-8">
          <Spinner class="size-6" />
        </div>
      {:else if solves.length === 0}
        <p class="text-foreground-l3 text-center py-8">No solves yet</p>
      {:else}
        <ul class="flex flex-col gap-2">
          {#each solves as solve, index (solve.id)}
            <li
              class="flex items-center justify-between gap-4 rounded-md border p-3"
            >
              <div class="flex items-center gap-3">
                <span class="text-foreground-l3 tabular-nums">
                  #{(page - 1) * PAGE_SIZE + index + 1}
                </span>
                <a
                  href="/profile/{solve.userId}"
                  class="max-w-48 font-medium hover:underline wrap-anywhere line-clamp-1"
                >
                  {solve.userName}
                </a>
              </div>
              <time
                datetime={new Date(solve.createdAt).toISOString()}
                class="text-foreground-l3 text-sm"
              >
                {formatTime(solve.createdAt)}
              </time>
            </li>
          {/each}
        </ul>
      {/if}
    </ScrollArea>

    {#if totalPages > 1}
      <Dialog.Footer class="justify-center sm:justify-center">
        <Pagination.Root
          count={solveCount}
          perPage={PAGE_SIZE}
          bind:page
          onPageChange={p => fetchSolves(p)}
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
                    <Pagination.Link
                      page={p}
                      isActive={currentPage === p.value}
                    >
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
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>

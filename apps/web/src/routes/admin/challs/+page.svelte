<script lang="ts">
  import LibraryPlus from '@iconify-svelte/tabler/library-plus-filled'
  import { Permissions } from '@rctf/types'
  import { Badge, Button, Card, Table } from '$lib/components'

  let { data } = $props()

  const hasWritePerms = $derived(
    data.user?.perms !== null &&
      data.user?.perms !== undefined &&
      (data.user.perms & Permissions.challsWrite) !== 0
  )

  const sortedChallenges = $derived(
    [...data.challenges].sort((a, b) => {
      const catCompare = a.category.localeCompare(b.category)
      if (catCompare !== 0) return catCompare
      return a.name.localeCompare(b.name)
    })
  )

  const categoryCount = $derived(
    new Set(data.challenges.map(c => c.category)).size
  )
</script>

<svelte:head>
  <title>Admin | {data.clientConfig.ctfName}</title>
</svelte:head>

<div class="flex flex-col gap-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-medium">Challenges</h1>
      <p class="text-foreground-l3">
        {data.challenges.length} challenge{data.challenges.length === 1
          ? ''
          : 's'}
        across {categoryCount} categor{categoryCount === 1 ? 'y' : 'ies'}
      </p>
    </div>
    {#if hasWritePerms}
      <Button href="/admin/challs/new">
        <LibraryPlus class="size-4" />
        New challenge
      </Button>
    {/if}
  </div>

  {#if data.error}
    <div
      class="bg-background-destructive text-foreground-destructive rounded-md p-3 text-sm"
      role="alert"
    >
      {data.error}
    </div>
  {/if}

  {#if data.challenges.length === 0}
    <Card.Root>
      <Card.Content class="py-12 text-center">
        <p class="text-foreground-l3">No challenges found.</p>
        {#if hasWritePerms}
          <Button href="/admin/challs/new" class="mt-4">
            <LibraryPlus class="size-4" />
            Create first challenge
          </Button>
        {/if}
      </Card.Content>
    </Card.Root>
  {:else}
    <Card.Root>
      <Card.Content class="p-0">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Category</Table.Head>
              <Table.Head>Name</Table.Head>
              <Table.Head>Author</Table.Head>
              <Table.Head class="text-right">Points</Table.Head>
              <Table.Head class="text-right">Files</Table.Head>
              <Table.Head></Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each sortedChallenges as challenge (challenge.id)}
              <Table.Row>
                <Table.Cell>
                  <Badge variant="secondary">{challenge.category}</Badge>
                </Table.Cell>
                <Table.Cell class="font-medium">{challenge.name}</Table.Cell>
                <Table.Cell class="text-foreground-l3">
                  {challenge.author}
                </Table.Cell>
                <Table.Cell class="text-right tabular-nums">
                  {challenge.points.min}–{challenge.points.max}
                </Table.Cell>
                <Table.Cell class="text-right tabular-nums">
                  {challenge.files.length}
                </Table.Cell>
                <Table.Cell class="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    href="/admin/challs/{challenge.id}"
                  >
                    Edit
                  </Button>
                </Table.Cell>
              </Table.Row>
            {/each}
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>
  {/if}
</div>

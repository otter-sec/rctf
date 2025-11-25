<script lang="ts">
  import Plus from '@lucide/svelte/icons/plus'
  import { Permissions } from '@rctf/types'
  import type { AdminChallenge } from '$lib/api'
  import { Badge, Button, Card, Table } from '$lib/components'

  let { data } = $props()

  const hasWritePerms = $derived(
    data.user?.perms !== null &&
      data.user?.perms !== undefined &&
      (data.user.perms & Permissions.challsWrite) !== 0
  )

  const groupedChallenges = $derived.by(() => {
    const grouped = new Map<string, AdminChallenge[]>()
    for (const challenge of data.challenges) {
      const category = challenge.category
      if (!grouped.has(category)) {
        grouped.set(category, [])
      }
      grouped.get(category)!.push(challenge)
    }
    return Array.from(grouped.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    )
  })
</script>

<svelte:head>
  <title>Admin Challenges | {data.clientConfig.ctfName}</title>
</svelte:head>

<div class="flex flex-col gap-6">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">Challenge Management</h1>
      <p class="text-muted-foreground">
        {data.challenges.length} challenge{data.challenges.length === 1
          ? ''
          : 's'}
      </p>
    </div>
    {#if hasWritePerms}
      <Button href="/admin/challs/new">
        <Plus class="size-4" />
        New Challenge
      </Button>
    {/if}
  </div>

  {#if data.error}
    <div
      class="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
      role="alert"
    >
      {data.error}
    </div>
  {/if}

  {#if data.challenges.length === 0}
    <Card.Root>
      <Card.Content class="py-12 text-center">
        <p class="text-muted-foreground">No challenges found.</p>
        {#if hasWritePerms}
          <Button href="/admin/challs/new" class="mt-4">
            <Plus class="size-4" />
            Create First Challenge
          </Button>
        {/if}
      </Card.Content>
    </Card.Root>
  {:else}
    {#each groupedChallenges as [category, challenges] (category)}
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            {category}
            <Badge variant="secondary">{challenges.length}</Badge>
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head>Name</Table.Head>
                <Table.Head>Author</Table.Head>
                <Table.Head class="text-right">Points</Table.Head>
                <Table.Head class="text-right">Files</Table.Head>
                <Table.Head></Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {#each challenges as challenge (challenge.id)}
                <Table.Row>
                  <Table.Cell class="font-medium">{challenge.name}</Table.Cell>
                  <Table.Cell class="text-muted-foreground">
                    {challenge.author}
                  </Table.Cell>
                  <Table.Cell class="text-right tabular-nums">
                    {challenge.points.min}–{challenge.points.max}
                  </Table.Cell>
                  <Table.Cell class="text-right tabular-nums">
                    {challenge.files.length}
                  </Table.Cell>
                  <Table.Cell class="text-right">
                    <Button variant="ghost" size="sm" href="/admin/challs/{challenge.id}">
                      Edit
                    </Button>
                  </Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>
        </Card.Content>
      </Card.Root>
    {/each}
  {/if}
</div>


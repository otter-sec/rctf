<script lang="ts">
  import { Badge, Card } from '$lib/components'

  interface Solve {
    id: string
    name: string
    category: string
    points: number | null
    createdAt: number
  }

  interface Props {
    solves: Solve[]
    emptyMessage?: string
  }

  let { solves, emptyMessage = 'No solves yet.' }: Props = $props()
</script>

// TODO(enscribe): remove
<Card.Root>
  <Card.Header>
    <Card.Title>
      Solves
      <Badge variant="secondary" class="ml-2">{solves.length}</Badge>
    </Card.Title>
  </Card.Header>
  <Card.Content>
    {#if solves.length > 0}
      <ul class="flex flex-col gap-2">
        {#each solves as solve (solve.id)}
          <li
            class="flex items-start justify-between gap-4 rounded-md border p-3"
          >
            <div class="flex flex-col gap-1">
              <span class="font-medium">{solve.name}</span>
              <span class="text-foreground-l3 text-sm">
                {solve.category} • {new Date(solve.createdAt).toLocaleString()}
              </span>
            </div>
            {#if solve.points !== null}
              <Badge variant="secondary">{solve.points} pts</Badge>
            {/if}
          </li>
        {/each}
      </ul>
    {:else}
      <p class="text-foreground-l3">{emptyMessage}</p>
    {/if}
  </Card.Content>
</Card.Root>

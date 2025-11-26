<script lang="ts">
  import { Badge, Button, Card } from '$lib/components'

  let { data } = $props()
</script>

<svelte:head>
  {#if data.user}
    <title>{data.user.name} | {data.clientConfig.ctfName}</title>
  {:else}
    <title>Profile not found | {data.clientConfig.ctfName}</title>
  {/if}
</svelte:head>

{#if data.user}
  {@const user = data.user}
  <div class="mx-auto flex flex-col gap-6">
    <Card.Root>
      <Card.Header>
        <Card.Title class="wrap-anywhere text-2xl">{user.name}</Card.Title>
        {#if user.ctftimeId}
          <Card.Description>
            CTFtime:
            <a
              href="https://ctftime.org/team/{user.ctftimeId}"
              target="_blank"
              rel="noopener noreferrer"
              class="text-foreground-prose-link hover:underline"
            >
              {user.ctftimeId}
            </a>
          </Card.Description>
        {/if}
      </Card.Header>
      <Card.Content>
        <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div class="flex flex-col gap-1">
            <span class="text-foreground-l3 text-sm">Division</span>
            <span class="font-medium">
              {data.clientConfig.divisions[user.division] ?? user.division}
            </span>
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-foreground-l3 text-sm">Score</span>
            <span class="font-medium tabular-nums">
              {user.score.toLocaleString()}
            </span>
          </div>
          {#if user.globalPlace !== null}
            <div class="flex flex-col gap-1">
              <span class="text-foreground-l3 text-sm">Global rank</span>
              <span class="font-medium tabular-nums">#{user.globalPlace}</span>
            </div>
          {/if}
          {#if user.divisionPlace !== null}
            <div class="flex flex-col gap-1">
              <span class="text-foreground-l3 text-sm">Division rank</span>
              <span class="font-medium tabular-nums">
                #{user.divisionPlace}
              </span>
            </div>
          {/if}
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header>
        <Card.Title>
          Solves
          <Badge variant="secondary" class="ml-2">{user.solves.length}</Badge>
        </Card.Title>
      </Card.Header>
      <Card.Content>
        {#if user.solves.length > 0}
          <ul class="flex flex-col gap-2">
            {#each user.solves as solve (solve.id)}
              <li
                class="flex items-start justify-between gap-4 rounded-md border p-3"
              >
                <div class="flex flex-col gap-1">
                  <span class="font-medium">{solve.name}</span>
                  <span class="text-foreground-l3 text-sm">
                    {solve.category} • {new Date(
                      solve.createdAt
                    ).toLocaleString()}
                  </span>
                </div>
                {#if solve.points !== null}
                  <Badge variant="secondary">{solve.points} pts</Badge>
                {/if}
              </li>
            {/each}
          </ul>
        {:else}
          <p class="text-foreground-l3">
            This team hasn't solved any challenges yet.
          </p>
        {/if}
      </Card.Content>
    </Card.Root>
  </div>
{:else}
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-xl">Profile not found</Card.Title>
    </Card.Header>
    <Card.Content class="flex flex-col gap-4">
      <p class="text-foreground-l3">
        {data.error ?? 'The requested profile could not be found.'}
      </p>
      <Button href="/scores">View leaderboard</Button>
    </Card.Content>
  </Card.Root>
{/if}

<script lang="ts">
  import Check from '@lucide/svelte/icons/check'
  import Copy from '@lucide/svelte/icons/copy'
  import Eye from '@lucide/svelte/icons/eye'
  import EyeOff from '@lucide/svelte/icons/eye-off'
  import { toast } from '$lib'
  import type { ClientConfig, UserProfile } from '$lib/api'
  import { Badge, Button, Card, Separator } from '$lib/components'

  let {
    user,
    clientConfig,
  }: { user: UserProfile; clientConfig: ClientConfig } = $props()

  let showToken = $state(false)
  let copied = $state(false)

  async function copyToken() {
    await navigator.clipboard.writeText(user.teamToken)
    toast.success('Team token copied to clipboard!')
    copied = true
    setTimeout(() => (copied = false), 2000)
  }
</script>

<div class="flex flex-col gap-6">
  <Card.Root>
    <Card.Header>
      <Card.Title class="text-2xl wrap-anywhere">{user.name}</Card.Title>
      {#if user.email}
        <Card.Description>{user.email}</Card.Description>
      {/if}
      {#if user.ctftimeId}
        <Card.Description>
          CTFtime:
          <a
            href="https://ctftime.org/team/{user.ctftimeId}"
            target="_blank"
            rel="noopener noreferrer"
            class="text-primary hover:underline"
          >
            {user.ctftimeId}
          </a>
        </Card.Description>
      {/if}
    </Card.Header>
    <Card.Content>
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div class="flex flex-col gap-1">
          <span class="text-muted-foreground text-sm">Division</span>
          <span class="font-semibold">
            {clientConfig.divisions[user.division] ?? user.division}
          </span>
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-muted-foreground text-sm">Score</span>
          <span class="font-semibold tabular-nums">
            {user.score.toLocaleString()}
          </span>
        </div>
        {#if user.globalPlace !== null}
          <div class="flex flex-col gap-1">
            <span class="text-muted-foreground text-sm">Global Rank</span>
            <span class="font-semibold tabular-nums">#{user.globalPlace}</span>
          </div>
        {/if}
        {#if user.divisionPlace !== null}
          <div class="flex flex-col gap-1">
            <span class="text-muted-foreground text-sm">Division Rank</span>
            <span class="font-semibold tabular-nums">
              #{user.divisionPlace}
            </span>
          </div>
        {/if}
      </div>
    </Card.Content>
  </Card.Root>

  <Card.Root>
    <Card.Header>
      <Card.Title>Team Token</Card.Title>
      <Card.Description>
        Share this token with your teammates so they can login to the same
        account.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="flex items-center gap-2">
        <code
          class="bg-muted flex-1 overflow-hidden text-ellipsis rounded-md border px-3 py-2 font-mono text-sm"
        >
          {#if showToken}
            {user.teamToken}
          {:else}
            {'•'.repeat(32)}
          {/if}
        </code>
        <Button
          variant="outline"
          size="icon"
          onclick={() => (showToken = !showToken)}
          aria-label={showToken ? 'Hide token' : 'Show token'}
        >
          {#if showToken}
            <EyeOff class="size-4" />
          {:else}
            <Eye class="size-4" />
          {/if}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onclick={copyToken}
          aria-label="Copy token"
        >
          {#if copied}
            <Check class="size-4 text-success" />
          {:else}
            <Copy class="size-4" />
          {/if}
        </Button>
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
                <span class="text-muted-foreground text-sm">
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
        <p class="text-muted-foreground">
          No solves yet. Head over to the
          <a href="/challs" class="text-primary hover:underline">challenges</a>
          page to get started!
        </p>
      {/if}
    </Card.Content>
  </Card.Root>
</div>

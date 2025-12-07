<script lang="ts">
  import { Avatar, Card } from '$lib/components'
  import { getInitials } from '$lib/utils'

  interface Props {
    name: string
    avatarUrl?: string | null
    email?: string | null
    ctftimeId?: string | null
    division: string
    divisionLabel: string
    score: number
    globalPlace: number | null
    divisionPlace: number | null
  }

  let {
    name,
    avatarUrl,
    email,
    ctftimeId,
    divisionLabel,
    score,
    globalPlace,
    divisionPlace,
  }: Props = $props()
</script>

<Card.Root>
  <Card.Header>
    <div class="flex items-center gap-4">
      {#key avatarUrl}
        <Avatar.Root class="size-16 shrink-0 rounded-xl">
          {#if avatarUrl}
            <Avatar.Image src={avatarUrl} alt={name} class="rounded-xl" />
          {/if}
          <Avatar.Fallback class="rounded-xl text-xl">
            {getInitials(name)}
          </Avatar.Fallback>
        </Avatar.Root>
      {/key}
      <div class="min-w-0 flex-1">
        <Card.Title class="wrap-anywhere text-2xl">{name}</Card.Title>
        {#if email}
          <Card.Description>{email}</Card.Description>
        {/if}
        {#if ctftimeId}
          <Card.Description>
            CTFtime:
            <a
              href="https://ctftime.org/team/{ctftimeId}"
              target="_blank"
              rel="noopener noreferrer"
              class="text-foreground-prose-link hover:underline">
              {ctftimeId}
            </a>
          </Card.Description>
        {/if}
      </div>
    </div>
  </Card.Header>
  <Card.Content>
    <div class="grid grid-cols-2 gap-4 md:grid-cols-4">
      <div class="flex flex-col gap-1">
        <span class="text-foreground-l3 text-sm">Division</span>
        <span class="font-medium">{divisionLabel}</span>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-foreground-l3 text-sm">Score</span>
        <span class="font-medium tabular-nums">{score.toLocaleString()}</span>
      </div>
      {#if globalPlace !== null}
        <div class="flex flex-col gap-1">
          <span class="text-foreground-l3 text-sm">Global rank</span>
          <span class="font-medium tabular-nums">#{globalPlace}</span>
        </div>
      {/if}
      {#if divisionPlace !== null}
        <div class="flex flex-col gap-1">
          <span class="text-foreground-l3 text-sm">Division rank</span>
          <span class="font-medium tabular-nums">#{divisionPlace}</span>
        </div>
      {/if}
    </div>
  </Card.Content>
</Card.Root>

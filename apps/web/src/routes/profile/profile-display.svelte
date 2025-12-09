<script lang="ts">
  import type { ClientConfig, PublicUserProfile } from '@rctf/types'
  import { Avatar } from '$lib/components'
  import { getInitials } from '$lib/utils'

  interface Props {
    user: PublicUserProfile
    clientConfig: ClientConfig
  }

  let { user, clientConfig }: Props = $props()

  const divisionLabel = $derived(clientConfig.divisions[user.division] ?? user.division)
</script>

<div class="bg-background-l1 flex h-[calc(100vh-72px)] flex-col overflow-hidden rounded-t-3xl">
  <div class="flex shrink-0 flex-col gap-2 py-2">
    <div class="flex items-center gap-3 px-9">
      {#key user.avatarUrl}
        <Avatar.Root class="size-10 shrink-0 rounded-lg">
          {#if user.avatarUrl}
            <Avatar.Image src={user.avatarUrl} alt={user.name} class="rounded-lg" />
          {/if}
          <Avatar.Fallback class="rounded-lg text-sm">
            {getInitials(user.name)}
          </Avatar.Fallback>
        </Avatar.Root>
      {/key}

      <div class="flex min-w-0 flex-1 flex-col">
        <span class="text-foreground-l0 truncate text-base">{user.name}</span>
        <div class="text-foreground-l3 flex items-center gap-1.5 text-sm">
          <span>{divisionLabel}</span>
          {#if user.ctftimeId}
            <span>•</span>
            <a
              href="https://ctftime.org/team/{user.ctftimeId}"
              target="_blank"
              rel="noopener noreferrer"
              class="text-foreground-prose-link hover:underline"
            >
              CTFtime
            </a>
          {/if}
        </div>
      </div>
    </div>

    <div class="flex justify-between px-9">
      <div class="flex gap-1 whitespace-nowrap">
        <span class="text-foreground-l3 text-base tabular-nums">
          {user.score.toLocaleString()}
        </span>
        <span class="text-foreground-l5 text-base">pts</span>
      </div>
      <div class="flex items-baseline gap-3 text-base whitespace-nowrap tabular-nums">
        {#if user.globalPlace !== null}
          <div class="flex gap-1">
            <span class="text-foreground-l3">#{user.globalPlace}</span>
            <span class="text-foreground-l5">global</span>
          </div>
        {/if}
        {#if user.divisionPlace !== null}
          <div class="flex gap-1">
            <span class="text-foreground-l3">#{user.divisionPlace}</span>
            <span class="text-foreground-l5">division</span>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

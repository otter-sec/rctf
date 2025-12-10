<script lang="ts">
  import type { ClientConfig, PublicUserProfile, UserProfile } from '@rctf/types'
  import { Avatar } from '$lib/components'
  import { getInitials } from '$lib/utils'

  interface Props {
    user: UserProfile | PublicUserProfile
    clientConfig: ClientConfig
  }

  let { user, clientConfig }: Props = $props()

  const divisionLabel = $derived(clientConfig.divisions[user.division] ?? user.division)
</script>

<div class="flex items-center justify-between gap-4 px-9 py-2">
  <div class="flex min-w-0 items-center gap-3">
    {#key user.avatarUrl}
      <Avatar.Root class="size-12 shrink-0 rounded-lg">
        {#if user.avatarUrl}
          <Avatar.Image src={user.avatarUrl} alt={user.name} class="rounded-lg" />
        {/if}
        <Avatar.Fallback class="rounded-lg text-sm">{getInitials(user.name)}</Avatar.Fallback>
      </Avatar.Root>
    {/key}

    <div class="flex min-w-0 flex-1 flex-col">
      <span class="text-foreground-l0 truncate text-xl">{user.name}</span>
      <div class="text-foreground-l3 flex items-center gap-1.5 text-base">
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

  <div class="flex shrink-0 flex-col items-end text-base whitespace-nowrap tabular-nums">
    {#if user.globalPlace !== null}
      <div class="flex gap-1">
        <span class="text-foreground-l3 text-right">#{user.globalPlace}</span>
        <span class="text-foreground-l5 text-right">global</span>
      </div>
    {/if}
    {#if user.divisionPlace !== null}
      <div class="flex gap-1">
        <span class="text-foreground-l3 text-right">#{user.divisionPlace}</span>
        <span class="text-foreground-l5 text-right">division</span>
      </div>
    {/if}
  </div>
</div>

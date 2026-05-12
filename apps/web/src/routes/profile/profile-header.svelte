<script lang="ts">
  import type { ClientConfig, PublicUserProfile, UserProfile } from '@rctf/types'
  import { ALL_REGIONS } from '@rctf/util'
  import { Avatar } from '$lib/components'
  import { countryCodeToFlagFilename, getInitials } from '$lib/utils'

  interface Props {
    user: UserProfile | PublicUserProfile
    clientConfig: ClientConfig
  }

  let { user, clientConfig }: Props = $props()

  const divisionLabel = $derived(clientConfig.divisions[user.division] ?? user.division)
  const flagFilename = $derived(
    user.countryCode ? countryCodeToFlagFilename(user.countryCode) : null
  )
  const countryName = $derived(
    user.countryCode ? (ALL_REGIONS.find(r => r.code === user.countryCode)?.name ?? null) : null
  )
</script>

<div class="flex flex-col gap-2 px-9 py-2 sm:flex-row sm:items-start sm:justify-between">
  <div class="flex min-w-0 gap-4">
    {#key user.avatarUrl}
      <Avatar.Root class="size-16 shrink-0 rounded-lg sm:size-20">
        {#if user.avatarUrl}
          <Avatar.Image src={user.avatarUrl} alt={user.name} class="rounded-lg" />
        {/if}
        <Avatar.Fallback class="rounded-lg text-xl sm:text-2xl"
          >{getInitials(user.name)}</Avatar.Fallback
        >
      </Avatar.Root>
    {/key}

    <div class="flex min-w-0 flex-col gap-1.5">
      <span class="text-foreground-l0 truncate text-lg/tight sm:text-xl/tight">{user.name}</span>

      <div class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm sm:gap-x-4">
        <span class="text-foreground-l4">Division</span>
        <span class="text-foreground-l2">{divisionLabel}</span>

        <span class="text-foreground-l4">Country</span>
        {#if flagFilename && countryName}
          <span class="text-foreground-l2 flex items-center gap-1.5">
            <img
              src="/flags/{flagFilename}"
              alt="{user.countryCode} flag"
              class="h-4 w-auto shrink-0"
            />
            <span class="truncate">{countryName}</span>
          </span>
        {:else}
          <span class="text-foreground-l5">(unspecified)</span>
        {/if}

        <span class="text-foreground-l4">Status</span>
        {#if user.statusText}
          <span class="text-foreground-l2 truncate">{user.statusText}</span>
        {:else}
          <span class="text-foreground-l5">(unspecified)</span>
        {/if}

        {#if user.ctftimeId}
          <span class="text-foreground-l4">CTFtime</span>
          <a
            href="https://ctftime.org/team/{user.ctftimeId}"
            target="_blank"
            rel="noopener noreferrer"
            class="text-foreground-prose-link hover:underline"
          >
            Team #{user.ctftimeId}
          </a>
        {/if}
      </div>
    </div>
  </div>

  {#if user.globalPlace !== null || user.divisionPlace !== null}
    <div
      class="flex shrink-0 justify-between text-sm tabular-nums sm:flex-col sm:items-end sm:gap-0.5"
    >
      {#if user.globalPlace !== null}
        <div class="flex gap-1">
          <span class="text-foreground-l2">#{user.globalPlace}</span>
          <span class="text-foreground-l4">global</span>
        </div>
      {/if}
      {#if user.divisionPlace !== null}
        <div class="flex gap-1">
          <span class="text-foreground-l2">#{user.divisionPlace}</span>
          <span class="text-foreground-l4">division</span>
        </div>
      {/if}
    </div>
  {/if}
</div>

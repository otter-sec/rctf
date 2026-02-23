<script lang="ts">
  import { Permissions } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { toast } from '$lib'
  import { clearToken } from '$lib/api'
  import wordmarkDark from '$lib/assets/wordmark-dark.svg'
  import wordmarkLight from '$lib/assets/wordmark-light.svg'
  import {
    Avatar,
    DropdownMenu,
    NavigationButton,
    NavigationCountdown,
    NavigationMobile,
    NavigationTeamStats,
    ThemeToggle,
    Tooltip,
  } from '$lib/components'
  import {
    IconChartAreaLineFilled,
    IconCopy,
    IconFlag3Filled,
    IconGavel,
    IconHomeFilled,
    IconLogin,
    IconLogout,
    IconSettingsFilled,
    IconUserCog,
    IconUserFilled,
  } from '$lib/icons'
  import { useClientConfig, useCurrentUser } from '$lib/query'
  import { countryCodeToFlagFilename, getInitials } from '$lib/utils'

  const queryClient = useQueryClient()
  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()
  const user = $derived(userQuery.data ?? null)
  const clientConfig = $derived(clientConfigQuery.data)

  const divisionLabel = $derived(
    user?.division ? (clientConfig?.divisions[user.division] ?? user.division) : 'No Division'
  )

  const isAdmin = $derived(
    user?.perms !== null && user?.perms !== undefined && (user.perms & Permissions.challsRead) !== 0
  )

  function handleLogout() {
    clearToken()
    queryClient.setQueryData(['user', 'self'], null)
    goto('/login')
  }

  function copyTeamToken() {
    if (user?.teamToken) {
      navigator.clipboard.writeText(user.teamToken)
      toast.success('Team token copied to clipboard!')
    }
  }
</script>

<header
  class="bg-background-l0 sticky top-0 z-50 flex items-center justify-between px-4 py-3 md:px-9"
>
  <div class="flex items-center gap-4">
    <a href="/" class="flex shrink-0 items-center">
      <img src={wordmarkLight} alt="Logo" class="block h-8 dark:hidden" />
      <img src={wordmarkDark} alt="Logo" class="hidden h-8 dark:block" />
    </a>

    <nav class="hidden items-center gap-2 md:flex">
      <Tooltip.Root>
        <Tooltip.Trigger>
          <NavigationButton href="/" activePath="/">
            {#snippet icon({ class: className })}
              <IconHomeFilled class={className} />
            {/snippet}
          </NavigationButton>
        </Tooltip.Trigger>
        <Tooltip.Content sideOffset={8}>Home</Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <NavigationButton href="/challenges" activePath="/challenges">
            {#snippet icon({ class: className })}
              <IconFlag3Filled class={className} />
            {/snippet}
          </NavigationButton>
        </Tooltip.Trigger>
        <Tooltip.Content sideOffset={8}>Challenges</Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <NavigationButton href="/scores" activePath="/scores">
            {#snippet icon({ class: className })}
              <IconChartAreaLineFilled class={className} />
            {/snippet}
          </NavigationButton>
        </Tooltip.Trigger>
        <Tooltip.Content sideOffset={8}>Scoreboard</Tooltip.Content>
      </Tooltip.Root>
      {#if isAdmin}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <NavigationButton activePath="/admin">
              {#snippet icon({ class: className })}
                <IconGavel class={className} />
              {/snippet}
            </NavigationButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="start" class="bg-background-l4 w-48 border-none">
            <DropdownMenu.Item
              class="data-highlighted:bg-background-l5"
              onclick={() => goto('/admin/challenges')}
            >
              <IconFlag3Filled class="size-5" />
              Manage challenges
            </DropdownMenu.Item>
            <DropdownMenu.Item
              class="data-highlighted:bg-background-l5"
              onclick={() => goto('/admin/teams')}
            >
              <IconUserFilled class="size-5" />
              Manage teams
            </DropdownMenu.Item>
            <DropdownMenu.Item
              class="data-highlighted:bg-background-l5"
              onclick={() => goto('/admin/settings')}
            >
              <IconSettingsFilled class="size-5" />
              Settings
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      {/if}
    </nav>
  </div>

  <div class="hidden items-center gap-2 md:flex">
    <NavigationCountdown />
    {#if user}
      <NavigationTeamStats />
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          class="hover:bg-background-l2 flex cursor-pointer items-center gap-3 rounded-lg pl-2"
        >
          <div class="flex flex-col items-end">
            <span class="text-foreground-l0 max-w-64 truncate text-lg leading-tight">
              {user.name}
            </span>
            <div class="flex items-center gap-1">
              {#if user.countryCode}
                {@const flagFilename = countryCodeToFlagFilename(user.countryCode)}
                <img
                  src="/flags/{flagFilename}"
                  alt="{user.countryCode} flag"
                  class="h-5 w-auto shrink-0"
                />
              {/if}
              {#if user.countryCode && user.statusText}
                <span class="text-foreground-l3 text-xl leading-none">·</span>
              {/if}
              {#if user.statusText}
                <span class="text-foreground-l3 max-w-32 truncate text-base">{user.statusText}</span
                >
              {:else if !user.countryCode}
                <span class="text-foreground-l3 text-base">{divisionLabel}</span>
              {/if}
            </div>
          </div>

          {#key user.avatarUrl}
            <Avatar.Root class="size-12 rounded-lg">
              {#if user.avatarUrl}
                <Avatar.Image src={user.avatarUrl} alt={user.name} class="rounded-lg" />
              {/if}
              <Avatar.Fallback class="rounded-lg text-sm">
                {getInitials(user.name)}
              </Avatar.Fallback>
            </Avatar.Root>
          {/key}
        </DropdownMenu.Trigger>

        <DropdownMenu.Content align="end" class="bg-background-l4 w-56 border-none">
          <DropdownMenu.Item class="data-highlighted:bg-background-l5" onclick={copyTeamToken}>
            Copy team token
            <IconCopy class="ml-auto size-5" />
          </DropdownMenu.Item>
          <DropdownMenu.Item
            class="data-highlighted:bg-background-l5"
            onclick={() => goto('/profile')}
          >
            Manage team
            <IconUserCog class="ml-auto size-5" />
          </DropdownMenu.Item>
          <DropdownMenu.Item class="data-highlighted:bg-background-l5" onclick={handleLogout}>
            Log out
            <IconLogout class="ml-auto size-5" />
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    {:else}
      <Tooltip.Root>
        <Tooltip.Trigger>
          <NavigationButton href="/login">
            {#snippet icon({ class: className })}
              <IconLogin class={className} />
            {/snippet}
          </NavigationButton>
        </Tooltip.Trigger>
        <Tooltip.Content sideOffset={8}>Login</Tooltip.Content>
      </Tooltip.Root>
    {/if}
    <ThemeToggle />
  </div>

  <div class="md:hidden">
    <NavigationMobile />
  </div>
</header>

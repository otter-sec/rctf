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
    ButtonNavigation,
    DropdownMenu,
    MobileNav,
    ThemeToggle,
    Tooltip,
  } from '$lib/components'
  import {
    IconChartAreaLineFilled,
    IconCopy,
    IconFlag3Filled,
    IconGavel,
    IconLogin,
    IconLogout,
    IconUserCog,
  } from '$lib/icons'
  import { useCurrentUser } from '$lib/query'
  import { getInitials } from '$lib/utils'

  const queryClient = useQueryClient()
  const userQuery = useCurrentUser()
  const user = $derived($userQuery.data ?? null)

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
  class="sticky top-0 z-50 flex items-center justify-between bg-background-l0 px-4 py-3 md:px-9">
  <div class="flex items-center gap-4">
    <a href="/" class="flex shrink-0 items-center">
      <img src={wordmarkLight} alt="Logo" class="h-8 block dark:hidden" />
      <img src={wordmarkDark} alt="Logo" class="h-8 hidden dark:block" />
    </a>

    <nav class="hidden items-center gap-2 md:flex">
      <Tooltip.Root>
        <Tooltip.Trigger>
          <ButtonNavigation href="/challenges" activePath="/challenges">
            {#snippet icon({ class: className })}
              <IconFlag3Filled class={className} />
            {/snippet}
          </ButtonNavigation>
        </Tooltip.Trigger>
        <Tooltip.Content sideOffset={8}>Challenges</Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <ButtonNavigation href="/scores" activePath="/scores">
            {#snippet icon({ class: className })}
              <IconChartAreaLineFilled class={className} />
            {/snippet}
          </ButtonNavigation>
        </Tooltip.Trigger>
        <Tooltip.Content sideOffset={8}>Scoreboard</Tooltip.Content>
      </Tooltip.Root>
      {#if isAdmin}
        <Tooltip.Root>
          <Tooltip.Trigger>
            <ButtonNavigation href="/admin/challs" activePath="/admin">
              {#snippet icon({ class: className })}
                <IconGavel class={className} />
              {/snippet}
            </ButtonNavigation>
          </Tooltip.Trigger>
          <Tooltip.Content sideOffset={8}>Admin</Tooltip.Content>
        </Tooltip.Root>
      {/if}
    </nav>
  </div>

  <div class="hidden items-center gap-2 md:flex">
    {#if user}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          class="flex cursor-pointer items-center gap-3 pl-2 rounded-lg hover:bg-background-l2">
          <div class="flex flex-col items-end">
            <span class="text-foreground-l0 text-lg leading-tight">
              {user.name}
            </span>
            <span class="text-foreground-l3 text-sm leading-tight">
              {user.division ?? 'No Division'}
            </span>
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

        <DropdownMenu.Content align="end" class="w-56">
          <DropdownMenu.Item onclick={copyTeamToken}>
            Copy team token
            <IconCopy class="ml-auto size-5" />
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => goto('/profile')}>
            Manage team
            <IconUserCog class="ml-auto size-5" />
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item onclick={handleLogout}>
            Log out
            <IconLogout class="ml-auto size-5" />
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    {:else}
      <Tooltip.Root>
        <Tooltip.Trigger>
          <ButtonNavigation href="/login">
            {#snippet icon({ class: className })}
              <IconLogin class={className} />
            {/snippet}
          </ButtonNavigation>
        </Tooltip.Trigger>
        <Tooltip.Content sideOffset={8}>Login</Tooltip.Content>
      </Tooltip.Root>
    {/if}
    <ThemeToggle />
  </div>

  <div class="md:hidden">
    <MobileNav />
  </div>
</header>

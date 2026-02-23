<script lang="ts">
  import { Permissions } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  import { toast } from '$lib'
  import { clearToken } from '$lib/api'
  import wordmarkDark from '$lib/assets/wordmark-dark.svg'
  import wordmarkLight from '$lib/assets/wordmark-light.svg'
  import { Sheet, ThemeToggle, Tooltip } from '$lib/components'
  import {
    IconChartAreaLineFilled,
    IconCopy,
    IconFlag3Filled,
    IconHomeFilled,
    IconLogin,
    IconLogout,
    IconMenu2,
    IconSettingsFilled,
    IconUserCog,
    IconUserFilled,
    IconX,
  } from '$lib/icons'
  import { useCurrentUser } from '$lib/query'

  const queryClient = useQueryClient()
  const userQuery = useCurrentUser()
  const user = $derived(userQuery.data ?? null)

  const isAdmin = $derived(
    user?.perms !== null && user?.perms !== undefined && (user.perms & Permissions.challsRead) !== 0
  )

  let open = $state(false)

  function handleLogout() {
    clearToken()
    queryClient.setQueryData(['user', 'self'], null)
    goto('/login')
    open = false
  }

  function copyTeamToken() {
    if (user?.teamToken) {
      navigator.clipboard.writeText(user.teamToken)
      toast.success('Team token copied to clipboard!')
    }
  }

  function navigate(href: string) {
    goto(href)
    open = false
  }

  interface NavItem {
    href: string
    activePath: string
    label: string
    icon: typeof IconFlag3Filled
    show?: boolean
  }

  const navItems: NavItem[] = $derived([
    {
      href: '/',
      activePath: '/',
      label: 'Home',
      icon: IconHomeFilled,
      show: true,
    },
    {
      href: '/challenges',
      activePath: '/challenges',
      label: 'Challenges',
      icon: IconFlag3Filled,
      show: true,
    },
    {
      href: '/scores',
      activePath: '/scores',
      label: 'Scoreboard',
      icon: IconChartAreaLineFilled,
      show: true,
    },
    {
      href: '/profile',
      activePath: '/profile',
      label: 'Manage team',
      icon: IconUserCog,
      show: !!user,
    },
    {
      href: '/admin/challenges',
      activePath: '/admin/challenges',
      label: 'Manage challenges',
      icon: IconFlag3Filled,
      show: isAdmin,
    },
    {
      href: '/admin/teams',
      activePath: '/admin/teams',
      label: 'Manage teams',
      icon: IconUserFilled,
      show: isAdmin,
    },
    {
      href: '/admin/settings',
      activePath: '/admin/settings',
      label: 'Settings',
      icon: IconSettingsFilled,
      show: isAdmin,
    },
  ])

  function isActive(activePath: string): boolean {
    if (activePath === '/') {
      return page.url.pathname === '/'
    }
    return page.url.pathname.startsWith(activePath)
  }
</script>

<Sheet.Root bind:open>
  <Sheet.Trigger>
    <div
      class="bg-background-l2 hover:bg-background-l3 flex items-center justify-center rounded-lg px-4 py-3"
    >
      <IconMenu2 class="text-foreground-l2 size-6" />
    </div>
  </Sheet.Trigger>
  <Sheet.Content side="left" class="flex w-72 flex-col p-0">
    <Sheet.Header class="sr-only">
      <Sheet.Title>Navigation</Sheet.Title>
    </Sheet.Header>

    <div class="flex items-center justify-between gap-2 px-4 pt-3">
      <a href="/" onclick={() => (open = false)} class="flex shrink-0 items-center">
        <img src={wordmarkLight} alt="Logo" class="block h-8 dark:hidden" />
        <img src={wordmarkDark} alt="Logo" class="hidden h-8 dark:block" />
      </a>
      <Sheet.Close>
        <div
          class="bg-background-l2 hover:bg-background-l3 flex items-center justify-center rounded-lg px-4 py-3"
        >
          <IconX class="text-foreground-l2 size-6" />
        </div>
      </Sheet.Close>
    </div>

    <nav class="flex flex-1 flex-col gap-1 px-4">
      {#each navItems as item}
        {#if item.show}
          <button
            onclick={() => navigate(item.href)}
            class="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-left
              {isActive(item.activePath)
              ? 'bg-background-accent text-foreground-accent'
              : 'text-foreground-l1 hover:bg-background-l2'}"
          >
            <item.icon
              class="size-5 {isActive(item.activePath)
                ? 'text-foreground-accent'
                : 'text-foreground-l2'}"
            />
            <span>{item.label}</span>
          </button>
        {/if}
      {/each}
    </nav>

    <div class="flex items-center justify-between p-4">
      <ThemeToggle />

      {#if user}
        <div class="flex items-center gap-2">
          <Tooltip.Root>
            <Tooltip.Trigger>
              <button
                onclick={copyTeamToken}
                class="bg-background-l2 hover:bg-background-l3 flex items-center justify-center rounded-lg px-4 py-3"
              >
                <IconCopy class="text-foreground-l2 size-6" />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content>Copy team token</Tooltip.Content>
          </Tooltip.Root>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <button
                onclick={handleLogout}
                class="bg-background-l2 hover:bg-background-l3 flex items-center justify-center rounded-lg px-4 py-3"
              >
                <IconLogout class="text-foreground-l2 size-6" />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content>Log out</Tooltip.Content>
          </Tooltip.Root>
        </div>
      {:else}
        <button
          onclick={() => navigate('/login')}
          class="bg-background-l2 hover:bg-background-l3 flex items-center justify-center rounded-lg px-4 py-3"
        >
          <IconLogin class="text-foreground-l2 size-6" />
        </button>
      {/if}
    </div>
  </Sheet.Content>
</Sheet.Root>

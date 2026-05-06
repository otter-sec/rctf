<script lang="ts">
  import { Permissions } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { goto } from '$app/navigation'
  import { arrowNavigation } from '$lib/actions/arrow-navigation'
  import { clearToken } from '$lib/api'
  import defaultWordmarkDark from '$lib/assets/wordmark-dark.svg'
  import defaultWordmarkLight from '$lib/assets/wordmark-light.svg'
  import {
    Avatar,
    DropdownMenu,
    NavigationButton,
    NavigationCountdown,
    NavigationMobile,
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
    IconTableFilled,
    IconUserCog,
  } from '$lib/icons'
  import { useClientConfig, useCurrentUser } from '$lib/query'
  import { countryCodeToFlagFilename, getInitials } from '$lib/utils'
  import { mergeProps } from 'bits-ui'
  import { toast } from 'svelte-sonner'

  const queryClient = useQueryClient()
  const userQuery = useCurrentUser()
  const clientConfigQuery = useClientConfig()
  const user = $derived(userQuery.data ?? null)
  const clientConfig = $derived(clientConfigQuery.data)
  const isArchived = $derived(clientConfig?.isArchived ?? false)
  const wordmarkLight = $derived(clientConfig?.logoLightUrl || defaultWordmarkLight)
  const wordmarkDark = $derived(clientConfig?.logoDarkUrl || defaultWordmarkDark)

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

  function copyLoginUrl() {
    if (user?.teamToken) {
      const url = `${window.location.origin}/login?token=${encodeURIComponent(user.teamToken)}`
      navigator.clipboard.writeText(url)
      toast.success('Login URL copied to clipboard!')
    }
  }
</script>

<header
  use:arrowNavigation
  class="bg-background-l0 sticky top-0 z-50 flex items-center justify-between px-4 py-3 md:px-9"
>
  <div class="flex items-center gap-4">
    <a
      href="/"
      class="focus-visible:ring-ring/50 ring-offset-background-l0 flex shrink-0 items-center rounded-md ring-offset-6 outline-none focus-visible:ring-[3px]"
    >
      <img src={wordmarkLight} alt="Logo" class="block h-8 dark:hidden" />
      <img src={wordmarkDark} alt="Logo" class="hidden h-8 dark:block" />
    </a>

    <nav class="hidden items-center gap-2 md:flex">
      <Tooltip.Root>
        <Tooltip.Trigger>
          {#snippet child({ props })}
            <NavigationButton {...props} href="/" activePath="/" aria-label="Home">
              {#snippet icon({ class: className })}
                <IconHomeFilled class={className} />
              {/snippet}
            </NavigationButton>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content sideOffset={8}>Home</Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger>
          {#snippet child({ props })}
            <NavigationButton
              {...props}
              href="/challenges"
              activePath="/challenges"
              aria-label="Challenges"
            >
              {#snippet icon({ class: className })}
                <IconFlag3Filled class={className} />
              {/snippet}
            </NavigationButton>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content sideOffset={8}>Challenges</Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger>
          {#snippet child({ props })}
            <NavigationButton
              {...props}
              href="/scores"
              activePath="/scores"
              aria-label="Scoreboard"
            >
              {#snippet icon({ class: className })}
                <IconChartAreaLineFilled class={className} />
              {/snippet}
            </NavigationButton>
          {/snippet}
        </Tooltip.Trigger>
        <Tooltip.Content sideOffset={8}>Scoreboard</Tooltip.Content>
      </Tooltip.Root>
      {#if isAdmin}
        <Tooltip.Root>
          <DropdownMenu.Root>
            <Tooltip.Trigger>
              {#snippet child({ props: tooltipProps })}
                <DropdownMenu.Trigger>
                  {#snippet child({ props: dropdownProps })}
                    {@const triggerProps = mergeProps(dropdownProps, tooltipProps)}
                    <NavigationButton {...triggerProps} activePath="/admin" aria-label="Admin menu">
                      {#snippet icon({ class: className })}
                        <IconGavel class={className} />
                      {/snippet}
                    </NavigationButton>
                  {/snippet}
                </DropdownMenu.Trigger>
              {/snippet}
            </Tooltip.Trigger>
            <DropdownMenu.Content
              align="start"
              class="bg-background-l4 border-background-l5 w-48 border-2"
            >
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
                <IconUserCog class="size-5" />
                Manage teams
              </DropdownMenu.Item>
              <DropdownMenu.Item
                class="data-highlighted:bg-background-l5"
                onclick={() => goto('/admin/submission-logs')}
              >
                <IconTableFilled class="size-5" />
                Submission logs
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
          <Tooltip.Content sideOffset={8}>Admin</Tooltip.Content>
        </Tooltip.Root>
      {/if}
    </nav>
  </div>

  <div class="hidden items-center gap-2 md:flex">
    <NavigationCountdown />
    {#if user && !isArchived}
      {#await import('$lib/components/navigation-team-stats.svelte') then { default: NavigationTeamStats }}
        <NavigationTeamStats />
      {/await}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          class="hover:bg-background-l2 focus-visible:ring-ring/50 flex cursor-pointer items-center gap-3 rounded-lg pl-2 outline-none focus-visible:ring-[3px]"
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

        <DropdownMenu.Content align="end" class="bg-background-l4 w-56">
          <DropdownMenu.Item class="data-highlighted:bg-background-l5" onclick={copyLoginUrl}>
            Copy login URL
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
    {:else if !isArchived}
      <Tooltip.Root>
        <Tooltip.Trigger>
          {#snippet child({ props })}
            <NavigationButton {...props} href="/login" aria-label="Login">
              {#snippet icon({ class: className })}
                <IconLogin class={className} />
              {/snippet}
            </NavigationButton>
          {/snippet}
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

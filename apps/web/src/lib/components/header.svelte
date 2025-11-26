<script lang="ts">
  import { Permissions } from '@rctf/types'
  import IconBell from '~icons/tabler/bell'
  import IconChartBar from '~icons/tabler/chart-bar'
  import IconCopy from '~icons/tabler/copy'
  import IconHammer from '~icons/tabler/hammer'
  import IconLogout from '~icons/tabler/logout'
  import IconSettings from '~icons/tabler/settings'
  import IconSwords from '~icons/tabler/swords'
  import IconUserCog from '~icons/tabler/user-cog'
  import { goto, invalidateAll } from '$app/navigation'
  import { toast } from '$lib'
  import { clearToken, type UserProfile } from '$lib/api'
  import wordmark from '$lib/assets/wordmark.svg'
  import { Avatar, DropdownMenu, NavButton, Tooltip } from '$lib/components'

  type Props = {
    user: UserProfile | null
  }

  let { user }: Props = $props()

  const isAdmin = $derived(
    user?.perms !== null &&
      user?.perms !== undefined &&
      (user.perms & Permissions.challsRead) !== 0
  )

  const teamInitials = $derived(
    user?.name
      ? user.name
          .split(' ')
          .map(w => w[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
      : '?'
  )

  function handleLogout() {
    clearToken()
    invalidateAll()
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
  class="sticky top-0 z-50 flex items-center justify-between bg-background-l0 px-9 py-3"
>
  <div class="flex items-center gap-4">
    <a href="/" class="flex shrink-0 items-center">
      <img src={wordmark} alt="Logo" class="h-8" />
    </a>

    <nav class="flex items-center gap-2">
      <Tooltip.Root>
        <Tooltip.Trigger>
          <NavButton href="/challs" activePath="/challs">
            {#snippet icon({ class: className })}
              <IconSwords class={className} />
            {/snippet}
          </NavButton>
        </Tooltip.Trigger>
        <Tooltip.Content sideOffset={8}>Challenges</Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <NavButton href="/scores" activePath="/scores">
            {#snippet icon({ class: className })}
              <IconChartBar class={className} />
            {/snippet}
          </NavButton>
        </Tooltip.Trigger>
        <Tooltip.Content sideOffset={8}>Scoreboard</Tooltip.Content>
      </Tooltip.Root>
      {#if isAdmin}
        <Tooltip.Root>
          <Tooltip.Trigger>
            <NavButton href="/admin/challs" activePath="/admin">
              {#snippet icon({ class: className })}
                <IconHammer class={className} />
              {/snippet}
            </NavButton>
          </Tooltip.Trigger>
          <Tooltip.Content sideOffset={8}>Admin</Tooltip.Content>
        </Tooltip.Root>
      {/if}
    </nav>
  </div>

  <div class="flex items-center gap-4">
    {#if user}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          class="flex cursor-pointer items-center gap-3 pl-2 rounded-lg hover:bg-background-l2"
        >
          <div class="flex flex-col items-end">
            <span class="text-foreground-l0 text-lg leading-tight">
              {user.name}
            </span>
            <span class="text-foreground-l3 text-sm leading-tight">
              {user.division ?? 'No Division'}
            </span>
          </div>

          <Avatar.Root class="size-12 rounded-lg">
            <Avatar.Fallback class="rounded-lg text-sm">
              {teamInitials}
            </Avatar.Fallback>
          </Avatar.Root>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content align="end" class="w-56">
          <DropdownMenu.Item onclick={copyTeamToken}>
            Copy team token
            <IconCopy class="ml-auto size-5" />
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item onclick={() => goto('/profile')}>
            Manage team
            <IconUserCog class="ml-auto size-5" />
          </DropdownMenu.Item>
          <DropdownMenu.Item onclick={() => goto('/preferences')}>
            Preferences
            <IconSettings class="ml-auto size-5" />
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item onclick={handleLogout}>
            Log out
            <IconLogout class="ml-auto size-5" />
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <Tooltip.Root>
        <Tooltip.Trigger>
          <NavButton href="#">
            {#snippet icon({ class: className })}
              <IconBell class={className} />
            {/snippet}
          </NavButton>
        </Tooltip.Trigger>
        <Tooltip.Content sideOffset={8}>Notifications</Tooltip.Content>
      </Tooltip.Root>
    {:else}
      <a
        href="/login"
        class="text-foreground-l1 text-sm font-medium hover:text-foreground-l0"
      >
        Login
      </a>
    {/if}
  </div>
</header>

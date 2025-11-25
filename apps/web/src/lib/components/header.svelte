<script lang="ts">
  import { Permissions } from '@rctf/types'
  import { goto, invalidateAll } from '$app/navigation'
  import { clearToken, type UserProfile } from '$lib/api'
  import { toast } from '$lib'
  import wordmark from '$lib/assets/wordmark.svg'
  import { Avatar, DropdownMenu, NavButton } from '$lib/components'
  import {
    IconBell,
    IconChartBar,
    IconCopy,
    IconHammer,
    IconLogout,
    IconSettings,
    IconSwords,
    IconUserCog,
  } from '$lib/icons'

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

<header class="flex items-center justify-between px-9 py-3">
  <div class="flex items-center gap-4">
    <a href="/" class="flex shrink-0 items-center">
      <img src={wordmark} alt="Logo" class="h-8" />
    </a>

    <nav class="flex items-center gap-2">
      <NavButton href="/challs" activePath="/challs">
        {#snippet icon({ class: className })}
          <IconSwords class={className} />
        {/snippet}
      </NavButton>
      <NavButton href="/scores" activePath="/scores">
        {#snippet icon({ class: className })}
          <IconChartBar class={className} />
        {/snippet}
      </NavButton>
      {#if isAdmin}
        <NavButton href="/admin/challs" activePath="/admin">
          {#snippet icon({ class: className })}
            <IconHammer class={className} />
          {/snippet}
        </NavButton>
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
          <DropdownMenu.Item onclick={() => goto('/team')}>
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

      <NavButton href="#">
        {#snippet icon({ class: className })}
          <IconBell class={className} />
        {/snippet}
      </NavButton>
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

<script lang="ts">
  import { Permissions } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { mergeProps } from '@zag-js/svelte'
  import wordmarkDark from '$lib/assets/wordmark-dark.svg'
  import wordmarkLight from '$lib/assets/wordmark-light.svg'
  import NavigationButton from '$lib/components/navigation-button.svelte'
  import NavigationCountdown from '$lib/components/navigation-countdown.svelte'
  import NavigationMobile from '$lib/components/navigation-mobile.svelte'
  import ThemeToggle from '$lib/components/theme-toggle.svelte'
  import IconChartAreaLineFilled from '$lib/icons/icon-chart-area-line-filled.svelte'
  import IconCopy from '$lib/icons/icon-copy.svelte'
  import IconFlag3Filled from '$lib/icons/icon-flag3-filled.svelte'
  import IconGavel from '$lib/icons/icon-gavel.svelte'
  import IconHomeFilled from '$lib/icons/icon-home-filled.svelte'
  import IconLogin from '$lib/icons/icon-login.svelte'
  import IconLogout from '$lib/icons/icon-logout.svelte'
  import IconSettingsFilled from '$lib/icons/icon-settings-filled.svelte'
  import IconTableFilled from '$lib/icons/icon-table-filled.svelte'
  import IconUserCog from '$lib/icons/icon-user-cog.svelte'
  import { useClientConfig } from '$lib/query/config'
  import { useCurrentUser } from '$lib/query/user'
  import Avatar from '$lib/ui/avatar.svelte'
  import Menu from '$lib/ui/menu.svelte'
  import Tooltip from '$lib/ui/tooltip.svelte'
  import { copyLoginUrl, logout } from '$lib/utils/auth'
  import { countryCodeToFlagFilename } from '$lib/utils/flags'
  import { hasPermissions } from '$lib/utils/permissions'

  const queryClient = useQueryClient()
  const configQuery = useClientConfig()
  const clientConfig = $derived(configQuery.data)
  const userQuery = useCurrentUser()
  const user = $derived(userQuery.data)

  const isArchived = $derived(clientConfig?.isArchived ?? false)
  const isAdmin = $derived(hasPermissions(user, Permissions.challsRead))

  const lightLogo = $derived(clientConfig?.logoLightUrl || wordmarkLight)
  const darkLogo = $derived(clientConfig?.logoDarkUrl || wordmarkDark)

  const divisionLabel = $derived(
    user?.division ? (clientConfig?.divisions[user.division] ?? user.division) : 'No Division'
  )

  const adminMenuItems = [
    {
      value: 'admin-challenges',
      label: 'Manage challenges',
      icon: IconFlag3Filled,
      href: '/admin/challenges',
    },
    { value: 'admin-teams', label: 'Manage teams', icon: IconUserCog, href: '/admin/teams' },
    {
      value: 'admin-submissions',
      label: 'Submissions',
      icon: IconTableFilled,
      href: '/admin/submissions',
    },
    {
      value: 'admin-settings',
      label: 'Settings',
      icon: IconSettingsFilled,
      href: '/admin/settings',
    },
  ]

  const userMenuItems = $derived([
    {
      value: 'copy-login-url',
      label: 'Copy login URL',
      icon: IconCopy,
      onSelect: () => {
        if (user?.teamToken) copyLoginUrl(user.teamToken)
      },
    },
    { value: 'profile', label: 'Manage team', icon: IconUserCog, href: '/profile' },
    { value: 'logout', label: 'Log out', icon: IconLogout, onSelect: () => logout(queryClient) },
  ])
</script>

<header>
  <nav-start>
    <a href="/" aria-label="Home">
      <logo-light><img src={lightLogo} alt={clientConfig?.ctfName} /></logo-light>
      <logo-dark><img src={darkLogo} alt={clientConfig?.ctfName} /></logo-dark>
    </a>
    <nav aria-label="Main">
      <Tooltip label="Home">
        {#snippet children({ props })}
          <NavigationButton {...props} href="/" activePath="/" label="Home" icon={IconHomeFilled} />
        {/snippet}
      </Tooltip>
      <Tooltip label="Challenges">
        {#snippet children({ props })}
          <NavigationButton
            {...props}
            href="/challenges"
            activePath="/challenges"
            label="Challenges"
            icon={IconFlag3Filled}
          />
        {/snippet}
      </Tooltip>
      <Tooltip label="Scoreboard">
        {#snippet children({ props })}
          <NavigationButton
            {...props}
            href="/scores"
            activePath="/scores"
            label="Scoreboard"
            icon={IconChartAreaLineFilled}
          />
        {/snippet}
      </Tooltip>
      {#if isAdmin}
        <Tooltip label="Admin">
          {#snippet children({ props: tooltipProps })}
            <Menu label="Admin menu" items={adminMenuItems}>
              {#snippet trigger({ props: menuProps })}
                <NavigationButton
                  {...mergeProps(tooltipProps, menuProps)}
                  activePath="/admin"
                  label="Admin menu"
                  icon={IconGavel}
                />
              {/snippet}
            </Menu>
          {/snippet}
        </Tooltip>
      {/if}
    </nav>
  </nav-start>

  <nav-end>
    <NavigationCountdown />
    {#if user && !isArchived}
      {@const currentUser = user}
      {#await import('$lib/components/navigation-team-stats.svelte') then { default: NavigationTeamStats }}
        <NavigationTeamStats />
      {/await}
      <Menu label="Account" items={userMenuItems} placement="bottom-end">
        {#snippet trigger({ props })}
          <button {...props}>
            <user-details>
              <user-name>{currentUser.name}</user-name>
              <user-meta>
                {#if currentUser.countryCode}
                  <img
                    src="/flags/{countryCodeToFlagFilename(currentUser.countryCode)}"
                    alt="{currentUser.countryCode} flag"
                  />
                {/if}
                {#if currentUser.countryCode && currentUser.statusText}
                  <meta-separator>·</meta-separator>
                {/if}
                {#if currentUser.statusText}
                  <user-status>{currentUser.statusText}</user-status>
                {:else if !currentUser.countryCode}
                  <user-status>{divisionLabel}</user-status>
                {/if}
              </user-meta>
            </user-details>
            <Avatar src={currentUser.avatarUrl} name={currentUser.name} />
          </button>
        {/snippet}
      </Menu>
    {:else if !isArchived}
      <Tooltip label="Login">
        {#snippet children({ props })}
          <NavigationButton {...props} href="/login" label="Login" icon={IconLogin} />
        {/snippet}
      </Tooltip>
    {/if}
    <ThemeToggle />
  </nav-end>

  <NavigationMobile />
</header>

<style>
  header {
    position: sticky;
    inset-block-start: 0;
    z-index: var(--layer-nav);
    display: flex;
    align-items: center;
    justify-content: space-between;
    block-size: var(--header-height);
    padding: 0.75rem 1rem;
    background: var(--background-l0);

    @media (width >= 48rem) {
      padding-inline: 2.25rem;
    }
  }

  nav-start {
    display: flex;
    align-items: center;
    gap: var(--space-s);

    > a img {
      display: block;
      block-size: 2rem;
    }
  }

  logo-light,
  logo-dark {
    display: contents;
  }

  logo-light {
    :global(:root[data-theme='dark']) & {
      display: none;
    }

    @media (prefers-color-scheme: dark) {
      :global(:root:not([data-theme])) & {
        display: none;
      }
    }
  }

  logo-dark {
    :global(:root[data-theme='light']) & {
      display: none;
    }

    @media (prefers-color-scheme: light) {
      :global(:root:not([data-theme])) & {
        display: none;
      }
    }
  }

  nav,
  nav-end {
    display: none;
    align-items: center;
    gap: var(--space-2xs);

    @media (width >= 48rem) {
      display: flex;
    }
  }

  [data-scope='menu'][data-part='trigger'] {
    --avatar-size: 3rem;

    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding-inline-start: 0.5rem;
    cursor: pointer;
    border-radius: var(--radius-lg);

    &:hover {
      background: var(--background-l2);
    }
  }

  user-details {
    display: flex;
    flex-direction: column;
    align-items: end;
  }

  user-name {
    display: block;
    max-inline-size: 16rem;
    overflow: hidden;
    font-size: 1.125rem;
    line-height: 1.25;
    color: var(--foreground-l0);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  user-meta {
    display: flex;
    align-items: center;
    gap: var(--space-3xs);

    img {
      block-size: 1.25rem;
      inline-size: auto;
      flex-shrink: 0;
    }
  }

  meta-separator {
    display: block;
    font-size: 1.25rem;
    line-height: 1;
    color: var(--foreground-l3);
  }

  user-status {
    display: block;
    max-inline-size: 8rem;
    overflow: hidden;
    font-size: 1rem;
    color: var(--foreground-l3);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>

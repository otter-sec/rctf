<script lang="ts">
  import { Permissions } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { mergeProps } from '@zag-js/svelte'
  import { afterNavigate } from '$app/navigation'
  import { page } from '$app/state'
  import wordmarkDark from '$lib/assets/wordmark-dark.svg'
  import wordmarkLight from '$lib/assets/wordmark-light.svg'
  import ThemeToggle from '$lib/components/theme-toggle.svelte'
  import IconChartAreaLineFilled from '$lib/icons/icon-chart-area-line-filled.svelte'
  import IconCopy from '$lib/icons/icon-copy.svelte'
  import IconFlag3Filled from '$lib/icons/icon-flag3-filled.svelte'
  import IconHomeFilled from '$lib/icons/icon-home-filled.svelte'
  import IconLogin from '$lib/icons/icon-login.svelte'
  import IconLogout from '$lib/icons/icon-logout.svelte'
  import IconMenu2 from '$lib/icons/icon-menu2.svelte'
  import IconSettingsFilled from '$lib/icons/icon-settings-filled.svelte'
  import IconTableFilled from '$lib/icons/icon-table-filled.svelte'
  import IconUserCog from '$lib/icons/icon-user-cog.svelte'
  import IconX from '$lib/icons/icon-x.svelte'
  import { useClientConfig } from '$lib/query/config'
  import { useCurrentUser } from '$lib/query/user'
  import Dialog from '$lib/ui/dialog.svelte'
  import Tooltip from '$lib/ui/tooltip.svelte'
  import { copyLoginUrl, logout } from '$lib/utils/auth'
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

  let open = $state(false)

  afterNavigate(() => {
    open = false
  })

  const navItems = $derived(
    [
      { href: '/', activePath: '/', label: 'Home', icon: IconHomeFilled, show: true },
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
        show: !!user && !isArchived,
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
        icon: IconUserCog,
        show: isAdmin,
      },
      {
        href: '/admin/submissions',
        activePath: '/admin/submissions',
        label: 'Submissions',
        icon: IconTableFilled,
        show: isAdmin,
      },
      {
        href: '/admin/settings',
        activePath: '/admin/settings',
        label: 'Settings',
        icon: IconSettingsFilled,
        show: isAdmin,
      },
    ].filter(item => item.show)
  )

  const isActive = (activePath: string) =>
    activePath === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(activePath)
</script>

<mobile-nav>
  <Dialog bind:open title="Navigation" titleHidden presentation="sheet">
    {#snippet trigger({ props })}
      <button {...props} aria-label="Open navigation">
        <IconMenu2 />
      </button>
    {/snippet}
    {#snippet children({ closeProps })}
      <sheet-header>
        <a href="/" aria-label="Home">
          <logo-light><img src={lightLogo} alt={clientConfig?.ctfName} /></logo-light>
          <logo-dark><img src={darkLogo} alt={clientConfig?.ctfName} /></logo-dark>
        </a>
        <button {...closeProps} aria-label="Close navigation">
          <IconX />
        </button>
      </sheet-header>
      <nav aria-label="Main">
        {#each navItems as item (item.href)}
          {@const Icon = item.icon}
          <a href={item.href} data-active={isActive(item.activePath) ? '' : undefined}>
            <Icon />
            {item.label}
          </a>
        {/each}
      </nav>
      <sheet-footer>
        <ThemeToggle />
        {#if user && !isArchived}
          {@const currentUser = user}
          <footer-actions>
            <Tooltip label="Copy login URL">
              {#snippet children({ props })}
                <button
                  {...mergeProps(props, {
                    onclick: () => {
                      if (currentUser.teamToken) copyLoginUrl(currentUser.teamToken)
                    },
                  })}
                  aria-label="Copy login URL"
                >
                  <IconCopy />
                </button>
              {/snippet}
            </Tooltip>
            <Tooltip label="Log out">
              {#snippet children({ props })}
                <button
                  {...mergeProps(props, { onclick: () => logout(queryClient) })}
                  aria-label="Log out"
                >
                  <IconLogout />
                </button>
              {/snippet}
            </Tooltip>
          </footer-actions>
        {:else if !isArchived}
          <a href="/login" aria-label="Login">
            <IconLogin />
          </a>
        {/if}
      </sheet-footer>
    {/snippet}
  </Dialog>
</mobile-nav>

<style>
  mobile-nav {
    display: block;

    @media (width >= 48rem) {
      display: none;
    }
  }

  /* the sheet body is portaled to <body>, so these rules must not be nested
     under mobile-nav — scoping still applies, DOM ancestry does not */
  button,
  sheet-footer a {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1rem;
    font-size: 1.5rem;
    color: var(--foreground-l2);
    background: var(--background-l2);
    border-radius: var(--radius-lg);
    cursor: pointer;

    &:hover {
      background: var(--background-l3);
    }
  }

  sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2xs);

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

  nav {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-3xs);

    a {
      display: flex;
      align-items: center;
      gap: var(--space-2xs);
      padding: var(--space-2xs) var(--space-xs);
      color: var(--foreground-l1);
      text-decoration: none;
      border-radius: var(--radius-lg);

      &:hover {
        background: var(--background-l2);
      }

      &[data-active] {
        color: var(--foreground-accent);
        background: var(--background-accent);
      }

      :global(svg) {
        flex-shrink: 0;
        font-size: 1.25rem;
      }
    }
  }

  sheet-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2xs);
  }

  footer-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
  }
</style>

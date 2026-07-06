<script lang="ts">
  import {
    DeleteCtftimeRoute,
    GoodCtftimeAuthSet,
    GoodCtftimeRemoved,
    SetCtftimeRoute,
    type ClientConfig,
    type UserProfile,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { apiRequest, showApiError } from '$lib/api'
  import { queryKeys } from '$lib/query/keys'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import Section from '$lib/ui/section.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import ButtonCtftime from '../(auth)/button-ctftime.svelte'

  type Props = {
    user: UserProfile
    clientConfig: ClientConfig
  }

  let { user, clientConfig }: Props = $props()

  const queryClient = useQueryClient()

  let linking = $state(false)
  let unlinking = $state(false)

  // A CTFtime link is the account's second auth method, so it can only be
  // dropped when an email exists to fall back on (AE3).
  const canDeleteCtftime = $derived(!!user.ctftimeId && !!user.email)

  function invalidateUser() {
    queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
  }

  async function linkCtftime(ctftimeToken: string) {
    linking = true
    try {
      const response = await apiRequest(SetCtftimeRoute, { ctftimeToken })
      if (response.kind === GoodCtftimeAuthSet.kind) {
        toast.success('CTFtime account linked!')
        invalidateUser()
      } else {
        showApiError(response)
      }
    } finally {
      linking = false
    }
  }

  async function unlinkCtftime() {
    unlinking = true
    try {
      const response = await apiRequest(DeleteCtftimeRoute, {})
      if (response.kind === GoodCtftimeRemoved.kind) {
        toast.success('CTFtime account unlinked!')
        invalidateUser()
      } else {
        showApiError(response)
      }
    } finally {
      unlinking = false
    }
  }
</script>

{#if clientConfig.ctftime}
  <Section title="CTFtime">
    <ctftime-settings>
      {#if user.ctftimeId}
        <ctftime-linked>
          <span>Team #{user.ctftimeId}</span>
          <a
            href="https://ctftime.org/team/{user.ctftimeId}"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on CTFtime →
          </a>
        </ctftime-linked>

        {#if canDeleteCtftime}
          <Button type="button" variant="outline" onclick={unlinkCtftime} disabled={unlinking}>
            {#if unlinking}
              <Spinner />
            {/if}
            Unlink CTFtime
          </Button>
        {:else}
          <ctftime-hint>
            Add an email address to your account before unlinking CTFtime.
          </ctftime-hint>
        {/if}
      {:else}
        <ctftime-hint>
          Link your CTFtime account to enable CTFtime login and display your team on your profile.
        </ctftime-hint>
        <ButtonCtftime
          clientId={clientConfig.ctftime.clientId}
          onCtftimeDone={data => linkCtftime(data.ctftimeToken)}
          disabled={linking}
        />
      {/if}
    </ctftime-settings>
  </Section>
{/if}

<style>
  ctftime-settings {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);

    :global(button) {
      inline-size: 100%;
    }
  }

  ctftime-linked {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    padding: var(--space-2xs) var(--space-xs);
    background: var(--background-l4);
    border-radius: var(--radius-md);

    > span {
      color: var(--foreground-l1);
      font-size: var(--step--1);
      font-weight: var(--font-weight-medium);
    }

    a {
      color: var(--foreground-l4);
      font-size: var(--step--2);

      &:hover {
        color: var(--foreground-l1);
      }
    }
  }

  ctftime-hint {
    display: block;
    color: var(--foreground-l4);
    font-size: var(--step--1);
  }
</style>

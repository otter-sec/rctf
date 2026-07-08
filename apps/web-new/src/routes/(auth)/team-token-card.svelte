<script lang="ts">
  import { IconCopy, IconSignIn } from '$lib/icons'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import Card from '$lib/ui/card.svelte'

  type Props = {
    teamToken: string
    loginUrl: string
  }

  let { teamToken, loginUrl }: Props = $props()

  async function copy(value: string, successMessage: string, errorMessage: string) {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(successMessage)
    } catch {
      toast.error(errorMessage)
    }
  }
</script>

<Card title="Save your team token" description="You will need this token to log in again.">
  <team-token-card>
    <token-box>
      <box-header>
        <span>Team token</span>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Copy team token"
          onclick={() =>
            copy(teamToken, 'Team token copied to clipboard', 'Failed to copy team token')}
        >
          <IconCopy />
          Copy
        </Button>
      </box-header>
      <code>{teamToken}</code>
    </token-box>
    <token-box>
      <box-header>
        <span>Login URL</span>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Copy login URL"
          onclick={() =>
            copy(loginUrl, 'Login URL copied to clipboard', 'Failed to copy login URL')}
        >
          <IconCopy />
          Copy
        </Button>
      </box-header>
      <code>{loginUrl}</code>
    </token-box>
    <p>Store your team token somewhere safe. It is the easiest way back into this account.</p>
    <Button href="/" variant="secondary">
      <IconSignIn />
      Continue
    </Button>
  </team-token-card>
</Card>

<style>
  team-token-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);

    > :global(a) {
      inline-size: 100%;
    }
  }

  token-box {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    padding: var(--space-2xs) var(--space-xs) var(--space-xs);
    background: var(--background-l2);
    border-radius: var(--radius-md);
  }

  box-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2xs);

    span {
      font-size: var(--step--1);
      color: var(--foreground-l3);
    }
  }

  code {
    font-family: var(--font-mono);
    font-size: var(--step--1);
    word-break: break-all;
    user-select: all;
  }

  p {
    font-size: var(--step--1);
    color: var(--foreground-l3);
  }
</style>

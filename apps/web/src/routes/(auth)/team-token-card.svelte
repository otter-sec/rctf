<script lang="ts">
  import { Button, Card } from '$lib/components'
  import { IconCopy, IconLogin } from '$lib/icons'
  import { toast } from 'svelte-sonner'

  interface Props {
    teamToken: string
    loginUrl: string
  }

  let { teamToken, loginUrl }: Props = $props()

  async function copyToken() {
    try {
      await navigator.clipboard.writeText(teamToken)
      toast.success('Team token copied to clipboard')
    } catch {
      toast.error('Failed to copy team token')
    }
  }

  async function copyLoginUrl() {
    try {
      await navigator.clipboard.writeText(loginUrl)
      toast.success('Login URL copied to clipboard')
    } catch {
      toast.error('Failed to copy login URL')
    }
  }
</script>

<Card.Root>
  <Card.Header>
    <Card.Title class="text-xl">Save your team token</Card.Title>
    <Card.Description>You will need this token to log in again.</Card.Description>
  </Card.Header>
  <Card.Content class="flex flex-col gap-4">
    <div class="bg-background-l2 min-w-0 rounded-md p-3 pt-1">
      <div class="mb-2 flex items-center justify-between gap-2">
        <div class="text-foreground-l3 text-sm">Team token</div>
        <Button variant="ghost" size="sm" onclick={copyToken} aria-label="Copy team token">
          <IconCopy class="size-4" />
          Copy
        </Button>
      </div>
      <code class="text-foreground-l1 block font-mono text-sm break-all select-all">
        {teamToken}
      </code>
    </div>
    <div class="bg-background-l2 min-w-0 rounded-md p-3 pt-1">
      <div class="mb-2 flex items-center justify-between gap-2">
        <div class="text-foreground-l3 text-sm">Login URL</div>
        <Button variant="ghost" size="sm" onclick={copyLoginUrl} aria-label="Copy login URL">
          <IconCopy class="size-4" />
          Copy
        </Button>
      </div>
      <code class="text-foreground-l1 block font-mono text-sm break-all select-all">
        {loginUrl}
      </code>
    </div>
    <p class="text-foreground-l3 text-sm">
      Store your team token somewhere safe. It is the easiest way back into this account.
    </p>
  </Card.Content>
  <Card.Footer>
    <Button href="/" variant="secondary" class="w-full">
      <IconLogin class="size-4" />
      Continue
    </Button>
  </Card.Footer>
</Card.Root>

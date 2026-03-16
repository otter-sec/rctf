<script lang="ts">
  import { Button, Card } from '$lib/components'
  import { useClientConfig } from '$lib/query'

  interface Props {
    message: string
  }

  const { message }: Props = $props()

  const clientConfigQuery = useClientConfig()
  const clientConfig = $derived(clientConfigQuery.data)
</script>

<Card.Root>
  <Card.Header>
    <Card.Title class="text-xl">Read-only archive</Card.Title>
    <Card.Description>This is a read-only archive of {clientConfig?.ctfName}.</Card.Description>
  </Card.Header>
  <Card.Content>
    <p class="text-foreground-l3 text-sm">
      This CTF has ended and the site is archived. {message}
    </p>
  </Card.Content>
  <Card.Footer>
    <Button href="/" class="w-full">Go to home</Button>
  </Card.Footer>
</Card.Root>

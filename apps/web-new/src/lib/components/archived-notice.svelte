<script lang="ts">
  import { useClientConfig } from '$lib/query/config'
  import Button from '$lib/ui/button.svelte'
  import Card from '$lib/ui/card.svelte'

  type Props = {
    message: string
  }

  let { message }: Props = $props()

  const configQuery = useClientConfig()
  const clientConfig = $derived(configQuery.data)
</script>

<Card
  title="Read-only archive"
  description="This is a read-only archive of {clientConfig?.ctfName}."
>
  <archived-notice>
    <p>This CTF has ended and the site is archived. {message}</p>
    <Button href="/">Go to home</Button>
  </archived-notice>
</Card>

<style>
  archived-notice {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);

    p {
      font-size: var(--step--1);
      color: var(--foreground-l3);
    }

    :global(a) {
      inline-size: 100%;
    }
  }
</style>

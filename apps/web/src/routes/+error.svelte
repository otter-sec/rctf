<script lang="ts">
  import { page } from '$app/state'
  import { Button, Card } from '$lib/components'
  import { IconAlertTriangleFilled, IconHomeFilled } from '$lib/icons'
</script>

<div class="flex flex-1 items-center justify-center p-4">
  <div class="w-full max-w-md">
    <Card.Root>
      <Card.Header>
        <Card.Title class="flex items-center gap-2 text-xl">
          <IconAlertTriangleFilled class="size-6 text-foreground-warning" />
          {page.status === 404 ? 'Page not found' : 'Something went wrong'}
        </Card.Title>
        <Card.Description>
          {#if page.status === 404}
            The page you're looking for doesn't exist.
          {:else}
            An error occurred while loading this page.
          {/if}
        </Card.Description>
      </Card.Header>
      <Card.Content>
        {#if page.error?.message}
          <div
            class="bg-background-destructive text-foreground-destructive mb-4 rounded-md p-3 text-sm"
            role="alert">
            {page.error.message}
          </div>
        {/if}

        <p class="text-foreground-l3 text-sm mb-4">
          Error code: {page.status}
        </p>

        <Button href="/" class="w-full">
          <IconHomeFilled class="size-4" />
          Go to home
        </Button>
      </Card.Content>
    </Card.Root>
  </div>
</div>

<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query'
  import { isAuthenticated } from '$lib/api'
  import { Button, Card } from '$lib/components'
  import { queryKeys, useClientConfig } from '$lib/query'

  const queryClient = useQueryClient()
  const clientConfigQuery = useClientConfig()
  const clientConfig = $derived(clientConfigQuery.data)

  const startTime = $derived(clientConfig?.startTime ?? 0)

  let timeLeft = $state(0)

  $effect(() => {
    if (startTime <= 0) return
    let invalidated = false

    const updateTimeLeft = () => {
      const remaining = startTime - Date.now()
      timeLeft = Math.max(0, remaining)

      if (remaining <= 0 && !invalidated) {
        invalidated = true
        queryClient.invalidateQueries({ queryKey: queryKeys.fullLeaderboard })
        queryClient.invalidateQueries({ queryKey: queryKeys.challenges })
        queryClient.invalidateQueries({ queryKey: queryKeys.clientConfig })
      }
    }

    updateTimeLeft()
    const interval = setInterval(updateTimeLeft, 1000)
    return () => clearInterval(interval)
  })

  const days = $derived(Math.floor(timeLeft / (1000 * 60 * 60 * 24)))
  const hours = $derived(Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)))
  const minutes = $derived(Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)))
  const seconds = $derived(Math.floor((timeLeft % (1000 * 60)) / 1000))
</script>

<div class="flex flex-1 items-center justify-center p-4">
  <div class="w-full max-w-md">
    <Card.Root>
      <Card.Header>
        <Card.Title class="text-xl">CTF not started</Card.Title>
        <Card.Description>The competition has not started yet. Check back soon!</Card.Description>
      </Card.Header>
      <Card.Content class="flex flex-col gap-4">
        <div class="flex justify-center gap-2">
          {#if days > 0}
            <div class="flex flex-col items-center">
              <span class="text-foreground-l0 text-2xl tabular-nums">{days}</span>
              <span class="text-foreground-l4 text-xs">days</span>
            </div>
            <span class="text-foreground-l4 text-2xl">:</span>
          {/if}
          <div class="flex flex-col items-center">
            <span class="text-foreground-l0 text-2xl tabular-nums"
              >{String(hours).padStart(2, '0')}</span
            >
            <span class="text-foreground-l4 text-xs">hours</span>
          </div>
          <span class="text-foreground-l4 text-2xl">:</span>
          <div class="flex flex-col items-center">
            <span class="text-foreground-l0 text-2xl tabular-nums"
              >{String(minutes).padStart(2, '0')}</span
            >
            <span class="text-foreground-l4 text-xs">mins</span>
          </div>
          <span class="text-foreground-l4 text-2xl">:</span>
          <div class="flex flex-col items-center">
            <span class="text-foreground-l0 text-2xl tabular-nums"
              >{String(seconds).padStart(2, '0')}</span
            >
            <span class="text-foreground-l4 text-xs">secs</span>
          </div>
        </div>

        {#if !isAuthenticated()}
          <Button href="/login" class="w-full">Login</Button>
        {/if}
      </Card.Content>
    </Card.Root>
  </div>
</div>

<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query'
  import { isAuthenticated } from '$lib'
  import { queryKeys, useClientConfig } from '$lib/query'
  import { Button, Card } from '$lib/components'

  const queryClient = useQueryClient()
  const clientConfigQuery = useClientConfig()
  const clientConfig = $derived($clientConfigQuery.data)

  const startTime = $derived(clientConfig?.startTime ?? 0)

  let timeLeft = $state(0)

  $effect(() => {
    if (startTime <= 0) return

    const updateTimeLeft = () => {
      const remaining = startTime - Date.now()
      timeLeft = Math.max(0, remaining)

      if (remaining <= 0) {
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
  <div class="w-full max-w-lg">
    <Card.Root class="bg-background-l1 border-none">
      <div class="flex flex-col items-center text-center">
        <h2 class="text-xl font-semibold">CTF Not Started</h2>
        <p class="text-foreground-l3 text-sm text-balance">The CTF has not started yet</p>
      </div>
      <Card.Content class="flex flex-col gap-6">
        <div class="flex justify-center gap-3">
          {#if days > 0}
            <div class="bg-background-l2 flex flex-col items-center rounded-xl px-4 py-3">
              <span class="text-foreground-l0 text-3xl font-bold tabular-nums">{days}</span>
              <span class="text-foreground-l4 text-xs tracking-wide uppercase">days</span>
            </div>
          {/if}
          <div class="bg-background-l2 flex flex-col items-center rounded-xl px-4 py-3">
            <span class="text-foreground-l0 text-3xl font-bold tabular-nums"
              >{String(hours).padStart(2, '0')}</span
            >
            <span class="text-foreground-l4 text-xs tracking-wide uppercase">hours</span>
          </div>
          <div class="bg-background-l2 flex flex-col items-center rounded-xl px-4 py-3">
            <span class="text-foreground-l0 text-3xl font-bold tabular-nums"
              >{String(minutes).padStart(2, '0')}</span
            >
            <span class="text-foreground-l4 text-xs tracking-wide uppercase">mins</span>
          </div>
          <div class="bg-background-l2 flex flex-col items-center rounded-xl px-4 py-3">
            <span class="text-foreground-l0 text-3xl font-bold tabular-nums"
              >{String(seconds).padStart(2, '0')}</span
            >
            <span class="text-foreground-l4 text-xs tracking-wide uppercase">secs</span>
          </div>
        </div>

        {#if !isAuthenticated()}
          <Button href="/login" class="w-full">Login</Button>
        {/if}
      </Card.Content>
    </Card.Root>
  </div>
</div>

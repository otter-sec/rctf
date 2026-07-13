<script lang="ts">
  import { useQueryClient } from '@tanstack/svelte-query'
  import { isAuthenticated } from '$lib/api'
  import { useClientConfig } from '$lib/query/config'
  import { queryKeys } from '$lib/query/keys'
  import Button from '$lib/ui/button.svelte'
  import Card from '$lib/ui/card.svelte'
  import { intervalToDuration } from '$lib/utils/time'

  const queryClient = useQueryClient()
  const configQuery = useClientConfig()
  const startTime = $derived(configQuery.data?.startTime ?? 0)

  let now = $state(Date.now())
  let invalidated = false

  $effect(() => {
    if (startTime <= 0) return
    const interval = setInterval(() => {
      now = Date.now()
      if (!invalidated && now >= startTime) {
        invalidated = true
        queryClient.invalidateQueries({ queryKey: queryKeys.fullLeaderboard })
        queryClient.invalidateQueries({ queryKey: queryKeys.challenges })
        queryClient.invalidateQueries({ queryKey: queryKeys.clientConfig })
      }
    }, 1000)
    return () => clearInterval(interval)
  })

  const duration = $derived(intervalToDuration(Math.max(0, startTime - now)))
  const pad = (value: number) => String(value).padStart(2, '0')
</script>

<ctf-not-started>
  <Card
    title="CTF not started"
    description="The competition has not started yet. Check back soon!"
  >
    <countdown-display>
      {#if duration.days > 0}
        <countdown-segment>
          <segment-value>{duration.days}</segment-value>
          <segment-label>days</segment-label>
        </countdown-segment>
        <segment-separator>:</segment-separator>
      {/if}
      <countdown-segment>
        <segment-value>{pad(duration.hours)}</segment-value>
        <segment-label>hours</segment-label>
      </countdown-segment>
      <segment-separator>:</segment-separator>
      <countdown-segment>
        <segment-value>{pad(duration.minutes)}</segment-value>
        <segment-label>mins</segment-label>
      </countdown-segment>
      <segment-separator>:</segment-separator>
      <countdown-segment>
        <segment-value>{pad(duration.seconds)}</segment-value>
        <segment-label>secs</segment-label>
      </countdown-segment>
    </countdown-display>
    {#if !isAuthenticated()}
      <Button href="/login">Login</Button>
    {/if}
  </Card>
</ctf-not-started>

<style>
  ctf-not-started {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: var(--space-s);

    :global(ui-card) {
      inline-size: 100%;
      max-inline-size: 28rem;
    }

    :global(a) {
      inline-size: 100%;
    }
  }

  countdown-display {
    display: flex;
    align-items: start;
    justify-content: center;
    gap: var(--space-2xs);
  }

  countdown-segment {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3xs);
  }

  segment-value {
    display: block;
    font-size: var(--step-2);
    color: var(--foreground-l0);
    font-variant-numeric: tabular-nums;
  }

  segment-label {
    display: block;
    font-size: 0.75rem;
    color: var(--foreground-l4);
  }

  segment-separator {
    display: block;
    font-size: var(--step-2);
    color: var(--foreground-l4);
  }
</style>

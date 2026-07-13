<script lang="ts">
  import { useClientConfig } from '$lib/query/config'
  import { intervalToDuration } from '$lib/utils/time'

  const configQuery = useClientConfig()
  const clientConfig = $derived(configQuery.data)

  const startTime = $derived(clientConfig?.startTime ?? 0)
  const endTime = $derived(clientConfig?.endTime ?? 0)

  let now = $state(Date.now())
  const hasStarted = $derived(now >= startTime)
  const hasEnded = $derived(now >= endTime)

  $effect(() => {
    if (hasEnded) return
    const interval = setInterval(() => (now = Date.now()), 1000)
    return () => clearInterval(interval)
  })

  const label = $derived(
    clientConfig?.isArchived
      ? 'Archived'
      : hasEnded
        ? 'CTF ended'
        : hasStarted
          ? 'to CTF end'
          : 'to CTF start'
  )

  const text = $derived.by(() => {
    if (hasEnded) return '--:--:--'
    const targetTime = hasStarted ? endTime : startTime
    const { days, hours, minutes, seconds } = intervalToDuration(
      Math.max(0, targetTime - now)
    )
    const pad = (value: number) => String(value).padStart(2, '0')
    const clock = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    return days > 0 ? `${days}d ${clock}` : clock
  })
</script>

{#if clientConfig && (startTime > 0 || endTime > 0)}
  <nav-countdown>
    <countdown-time>{text}</countdown-time>
    <countdown-label>{label}</countdown-label>
  </nav-countdown>
{/if}

<style>
  nav-countdown {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    block-size: 3rem;
    min-inline-size: 8rem;
    padding-inline: var(--space-s);
    background: var(--background-l2);
    border-radius: var(--radius-lg);

    @media (width < 64rem) {
      display: none;
    }
  }

  countdown-time {
    display: block;
    color: var(--foreground-l0);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  countdown-label {
    display: block;
    font-size: 0.75rem;
    color: var(--foreground-l3);
  }
</style>

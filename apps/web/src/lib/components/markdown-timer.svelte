<script lang="ts">
  import { getClientConfig } from '$lib/api'
  import { intervalToDuration } from '$lib/utils/time'

  const clientConfig = getClientConfig()

  const startTime = clientConfig?.startTime ?? 0
  const endTime = clientConfig?.endTime ?? 0
  const isArchived = clientConfig?.isArchived ?? false

  let now = $state(Date.now())

  const hasStarted = $derived(now >= startTime)
  const hasEnded = $derived(now >= endTime)
  const targetTime = $derived(hasStarted ? endTime : startTime)
  const duration = $derived(intervalToDuration(targetTime - now))

  $effect(() => {
    if (isArchived || hasEnded) return
    const interval = setInterval(() => (now = Date.now()), 1000)
    return () => clearInterval(interval)
  })

  const label = $derived(
    isArchived
      ? 'The CTF is archived.'
      : hasEnded
        ? 'The CTF is over.'
        : hasStarted
          ? 'CTF ends in'
          : 'CTF starts in'
  )

  const pad = (value: number) => String(value).padStart(2, '0')
</script>

<markdown-timer>
  <timer-label>{label}</timer-label>
  {#if !hasEnded}
    <timer-units>
      {#if duration.days > 0}
        <timer-unit>
          <timer-value>{duration.days}</timer-value>
          <timer-caption>days</timer-caption>
        </timer-unit>
        <timer-separator>:</timer-separator>
      {/if}
      <timer-unit>
        <timer-value>{pad(duration.hours)}</timer-value>
        <timer-caption>hours</timer-caption>
      </timer-unit>
      <timer-separator>:</timer-separator>
      <timer-unit>
        <timer-value>{pad(duration.minutes)}</timer-value>
        <timer-caption>mins</timer-caption>
      </timer-unit>
      <timer-separator>:</timer-separator>
      <timer-unit>
        <timer-value>{pad(duration.seconds)}</timer-value>
        <timer-caption>secs</timer-caption>
      </timer-unit>
    </timer-units>
  {/if}
</markdown-timer>

<style>
  markdown-timer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2xs);
    color: var(--foreground-l3);
    font-size: var(--step--1);
  }

  timer-units {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2xs);
  }

  timer-unit {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  timer-value,
  timer-separator {
    display: block;
    font-size: var(--step-2);
    line-height: 1.2;
  }

  timer-value {
    color: var(--foreground-l0);
    font-variant-numeric: tabular-nums;
  }

  timer-separator,
  timer-caption {
    color: var(--foreground-l4);
  }

  timer-caption {
    display: block;
  }

  timer-label {
    display: block;
  }
</style>

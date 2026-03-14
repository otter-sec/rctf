<script lang="ts">
  import { getClientConfig } from '$lib/api'
  import { onDestroy } from 'svelte'

  const clientConfig = getClientConfig()

  const startTime = clientConfig?.startTime ?? 0
  const endTime = clientConfig?.endTime ?? 0

  let now = $state(Date.now())
  const interval = setInterval(() => (now = Date.now()), 1000)
  onDestroy(() => clearInterval(interval))

  const hasStarted = $derived(now >= startTime)
  const hasEnded = $derived(now >= endTime)
  const targetTime = $derived(hasStarted ? endTime : startTime)

  const timeLeft = $derived(Math.max(0, targetTime - now))
  const days = $derived(Math.floor(timeLeft / (1000 * 60 * 60 * 24)))
  const hours = $derived(Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)))
  const minutes = $derived(Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)))
  const seconds = $derived(Math.floor((timeLeft % (1000 * 60)) / 1000))

  const label = $derived(
    hasEnded ? 'The CTF is over.' : hasStarted ? 'CTF ends in' : 'CTF starts in'
  )
</script>

<div class="not-prose my-4 flex flex-col items-center gap-2">
  <span class="text-foreground-l3 text-sm">{label}</span>
  {#if !hasEnded}
    <div class="flex items-start gap-2">
      {#if days > 0}
        <div class="flex flex-col items-center">
          <span class="text-foreground-l0 text-2xl tabular-nums">{days}</span>
          <span class="text-foreground-l4 text-xs">days</span>
        </div>
        <span class="text-foreground-l4 text-2xl leading-8">:</span>
      {/if}
      <div class="flex flex-col items-center">
        <span class="text-foreground-l0 text-2xl tabular-nums"
          >{String(hours).padStart(2, '0')}</span
        >
        <span class="text-foreground-l4 text-xs">hours</span>
      </div>
      <span class="text-foreground-l4 text-2xl leading-8">:</span>
      <div class="flex flex-col items-center">
        <span class="text-foreground-l0 text-2xl tabular-nums"
          >{String(minutes).padStart(2, '0')}</span
        >
        <span class="text-foreground-l4 text-xs">mins</span>
      </div>
      <span class="text-foreground-l4 text-2xl leading-8">:</span>
      <div class="flex flex-col items-center">
        <span class="text-foreground-l0 text-2xl tabular-nums"
          >{String(seconds).padStart(2, '0')}</span
        >
        <span class="text-foreground-l4 text-xs">secs</span>
      </div>
    </div>
  {/if}
</div>

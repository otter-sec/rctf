<script lang="ts">
  import { intervalToDuration } from 'date-fns'
  import { useClientConfig } from '$lib/query'
  import { onDestroy } from 'svelte'

  const clientConfigQuery = useClientConfig()
  const clientConfig = $derived(clientConfigQuery.data)

  const startTime = $derived(clientConfig?.startTime ?? 0)
  const endTime = $derived(clientConfig?.endTime ?? 0)

  let now = $state(Date.now())
  const interval = setInterval(() => {
    now = Date.now()
  }, 1000)

  onDestroy(() => clearInterval(interval))

  const hasStarted = $derived(now >= startTime)
  const hasEnded = $derived(now >= endTime)
  const targetTime = $derived(hasStarted ? endTime : startTime)
  const label = $derived(hasEnded ? 'CTF ended' : hasStarted ? 'to CTF end' : 'to CTF start')

  const countdownText = $derived.by(() => {
    if (hasEnded) return '--:--:--'

    const diff = Math.max(0, targetTime - now)
    const {
      days = 0,
      hours = 0,
      minutes = 0,
      seconds = 0,
    } = intervalToDuration({
      start: 0,
      end: diff,
    })

    const hh = hours.toString().padStart(2, '0')
    const mm = minutes.toString().padStart(2, '0')
    const ss = seconds.toString().padStart(2, '0')

    return days > 0 ? `${days}d ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`
  })
</script>

{#if clientConfig && (startTime > 0 || endTime > 0)}
  <div
    class="bg-background-l2 hidden h-12 min-w-32 flex-col items-center justify-center rounded-lg px-5 lg:flex"
  >
    <span class="text-foreground-l0 text-base leading-tight whitespace-nowrap tabular-nums">
      {countdownText}
    </span>
    <span class="text-foreground-l3 text-xs leading-tight">{label}</span>
  </div>
{/if}

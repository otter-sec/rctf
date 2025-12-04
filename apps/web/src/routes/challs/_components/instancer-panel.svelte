<script lang="ts">
  import {
    CreateInstanceRouteV2,
    DeleteInstanceRouteV2,
    ExposeKind,
    ExtendInstanceRouteV2,
    GetInstanceStatusRouteV2,
    InstanceStatus,
  } from '@rctf/types'
  import { apiRequest } from '$lib/api'
  import { Button, Progress } from '$lib/components'
  import { IconCopy, IconLoader } from '$lib/icons'
  import { formatCountdown } from '$lib/utils'
  import { toast } from 'svelte-sonner'

  interface Props {
    challengeId: string
  }

  let { challengeId }: Props = $props()

  let status = $state(InstanceStatus.STOPPED)
  let endpoints = $state<{ kind: ExposeKind; host: string; port: number }[]>([])
  let timeLeft = $state<number | null>(null)
  let loading = $state(true)
  let actioning = $state(false)
  let error = $state<string | null>(null)

  function formatUrl(kind: ExposeKind, host: string, port: number) {
    if (kind === ExposeKind.HTTP) return port === 80 ? `http://${host}` : `http://${host}:${port}`
    if (kind === ExposeKind.HTTPS)
      return port === 443 ? `https://${host}` : `https://${host}:${port}`
    return `${host}:${port}`
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Failed to copy')
    }
  }

  async function fetchStatus() {
    const res = await apiRequest(GetInstanceStatusRouteV2, { id: challengeId })
    if (res.kind === 'goodInstanceStatus') {
      status = res.data.status
      endpoints = res.data.endpoints ?? []
      timeLeft = res.data.timeLeftMilliseconds
      error = null
    } else if (res.kind === 'badInstancerError') {
      error = res.data.message
    }
    loading = false
  }

  async function start() {
    actioning = true
    const res = await apiRequest(CreateInstanceRouteV2, { id: challengeId })
    if (res.kind === 'goodInstanceStatus') {
      status = res.data.status
      endpoints = res.data.endpoints ?? []
      timeLeft = res.data.timeLeftMilliseconds
      error = null
      toast.success('Instance started')
    } else if (res.kind === 'badInstancerError') {
      toast.error(res.data.message)
    }
    actioning = false
  }

  async function stop() {
    actioning = true
    const res = await apiRequest(DeleteInstanceRouteV2, { id: challengeId })
    if (res.kind === 'goodInstanceStatus') {
      status = res.data.status
      endpoints = res.data.endpoints ?? []
      timeLeft = res.data.timeLeftMilliseconds
      error = null
      toast.success('Instance stopped')
    } else if (res.kind === 'badInstancerError') {
      toast.error(res.data.message)
    }
    actioning = false
  }

  async function extend() {
    actioning = true
    const res = await apiRequest(ExtendInstanceRouteV2, { id: challengeId })
    if (res.kind === 'goodInstanceStatus') {
      status = res.data.status
      endpoints = res.data.endpoints ?? []
      timeLeft = res.data.timeLeftMilliseconds
      error = null
      toast.success('Instance extended')
    } else if (res.kind === 'badInstancerError') {
      toast.error(res.data.message)
    }
    actioning = false
  }

  $effect(() => {
    fetchStatus()
    const poll = setInterval(() => {
      if (status === InstanceStatus.RUNNING || status === InstanceStatus.STARTING) fetchStatus()
    }, 5000)
    const tick = setInterval(() => {
      if (status === InstanceStatus.RUNNING && timeLeft !== null && timeLeft > 0) {
        timeLeft = Math.max(0, timeLeft - 1000)
      }
    }, 1000)
    return () => {
      clearInterval(poll)
      clearInterval(tick)
    }
  })
</script>

<div class="flex h-full flex-col p-3">
  {#if loading}
    <div class="flex flex-col items-center justify-center">
      <IconLoader class="size-5 animate-spin text-foreground-l4" />
    </div>
  {:else if error}
    <div class="flex flex-col items-center justify-center space-y-2 text-center">
      <p class="text-sm text-foreground-destructive">{error}</p>
      <Button size="sm" onclick={fetchStatus}>Retry</Button>
    </div>
  {:else if status === InstanceStatus.STOPPED}
    <div class="flex flex-col items-center justify-center space-y-3 text-center">
      <p class="text-sm text-foreground-l3">No instance running</p>
      <Button onclick={start} disabled={actioning} class="w-full">
        {#if actioning}<IconLoader class="animate-spin" />{/if}
        Start instance
      </Button>
    </div>
  {:else}
    <div class="flex flex-1 flex-col gap-3">
      {#if status === InstanceStatus.STARTING || status === InstanceStatus.ERRORED}
        <div class="flex items-center justify-center gap-2 text-sm text-foreground-l3">
          <IconLoader class="size-4 animate-spin" />
          {#if status === InstanceStatus.STARTING}
            <span>Starting...</span>
          {:else}
            <span>Errored</span>
          {/if}
        </div>
      {/if}

      {#each endpoints as { kind, host, port }, i}
        {@const url = formatUrl(kind, host, port)}
        <div class="space-y-1">
          <div class="flex justify-between text-sm text-foreground-l3">
            <span>{endpoints.length > 1 ? `Endpoint ${i + 1}` : 'URL'}</span>
            <span>{kind === ExposeKind.TCP_SSL ? 'TCP+SSL' : kind}</span>
          </div>
          <button
            type="button"
            class="group flex w-full items-center justify-between gap-2 rounded-md bg-background-l4 px-3 py-2"
            onclick={() => copy(url)}>
            <span class="truncate font-mono text-sm text-foreground-accent">{url}</span>
            <IconCopy class="size-4 shrink-0 text-foreground-l4 hover:text-foreground-l2" />
          </button>
        </div>
      {/each}

      {#if timeLeft !== null}
        <div class="mt-auto space-y-1.5">
          <Progress value={timeLeft} max={120000} class="h-1.5" />
          <p class="text-center text-sm text-foreground-l3">
            {formatCountdown(timeLeft)} remaining
          </p>
        </div>
      {/if}

      <div class="flex gap-2">
        <Button variant="secondary" onclick={extend} disabled={actioning || status === InstanceStatus.STARTING} class="flex-1">
          {#if actioning}<IconLoader class="animate-spin" />{/if}
          Extend
        </Button>
        <Button variant="destructive" onclick={stop} disabled={actioning || status === InstanceStatus.STARTING} class="flex-1">
          {#if actioning}<IconLoader class="animate-spin" />{/if}
          Stop
        </Button>
      </div>
    </div>
  {/if}
</div>

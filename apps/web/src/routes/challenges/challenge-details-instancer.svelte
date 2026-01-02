<script lang="ts">
  import {
    CreateInstanceRouteV2,
    DeleteInstanceRouteV2,
    ExposeKind,
    ExtendInstanceRouteV2,
    GetInstanceStatusRouteV2,
    InstanceStatus,
    ProtectedAction,
  } from '@rctf/types'
  import { onMount } from 'svelte'
  import { apiRequest, isAuthenticated } from '$lib/api'
  import { Button, Progress } from '$lib/components'
  import CaptchaNotice from '$lib/components/captcha-notice.svelte'
  import { IconCopy, IconLoader, IconLogin } from '$lib/icons'
  import { useClientConfig } from '$lib/query'
  import { formatCountdown } from '$lib/utils'
  import { toast } from 'svelte-sonner'

  interface Props {
    challengeId: string
    instanceLifetime: number
  }

  let { challengeId, instanceLifetime }: Props = $props()

  const clientConfigQuery = useClientConfig()
  const clientConfig = $derived($clientConfigQuery.data)

  let status = $state(InstanceStatus.STOPPED)
  let endpoints = $state<{ kind: ExposeKind; host: string; port: number; title?: string }[]>([])
  let timeLeft = $state<number | null>(null)
  let loading = $state(true)
  let actioning = $state(false)
  let error = $state<string | null>(null)

  function formatEndpoint(kind: ExposeKind, host: string, port: number) {
    if (kind === ExposeKind.HTTP) return port === 80 ? `http://${host}` : `http://${host}:${port}`
    if (kind === ExposeKind.HTTPS)
      return port === 443 ? `https://${host}` : `https://${host}:${port}`
    if (kind === ExposeKind.TCP) return `nc ${host} ${port}`
    return `ncat --ssl ${host} ${port}`
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
    } else {
      error = res.message
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
    } else {
      toast.error(res.message)
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
    } else {
      toast.error(res.message)
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
    } else {
      toast.error(res.message)
    }
    actioning = false
  }

  onMount(() => {
    fetchStatus()
    const tick = setInterval(() => {
      if (status === InstanceStatus.RUNNING && timeLeft !== null && timeLeft > 0) {
        timeLeft = Math.max(0, timeLeft - 1000)
      }
    }, 1_000)
    return () => clearInterval(tick)
  })

  $effect(() => {
    if (status === InstanceStatus.STOPPED) return
    const interval = status === InstanceStatus.STARTING ? 2_000 : 10_000
    const poll = setInterval(fetchStatus, interval)
    return () => clearInterval(poll)
  })
</script>

<div class="flex h-full flex-col p-3">
  {#if !isAuthenticated()}
    <div class="flex flex-col items-center justify-center space-y-3 text-center">
      <p class="text-foreground-l3 text-sm">Login to use the instancer.</p>
      <Button href="/login" class="w-full gap-2">
        <IconLogin class="size-4" />
        Login
      </Button>
    </div>
  {:else if loading}
    <div class="flex flex-1 flex-col items-center justify-center">
      <IconLoader class="text-foreground-l4 size-5 animate-spin" />
    </div>
  {:else if error}
    <div class="flex flex-col items-center justify-center space-y-2 text-center">
      <p class="text-foreground-destructive text-sm">{error}</p>
      <Button size="sm" onclick={fetchStatus}>Retry</Button>
    </div>
  {:else if status === InstanceStatus.STOPPED}
    <div class="flex flex-col items-center justify-center space-y-3 text-center">
      <p class="text-foreground-l3 text-sm">No instance running.</p>
      <Button onclick={start} disabled={actioning} class="w-full">
        {#if actioning}<IconLoader class="animate-spin" />{/if}
        Start instance
      </Button>
      <CaptchaNotice config={clientConfig} action={ProtectedAction.InstancerStart} />
    </div>
  {:else}
    <div class="flex flex-1 flex-col gap-3">
      {#if status === InstanceStatus.STARTING || status === InstanceStatus.ERRORED}
        <div class="text-foreground-l3 flex items-center justify-center gap-2 text-sm">
          {#if status === InstanceStatus.STARTING}
            <IconLoader class="size-4 animate-spin" />
            <span>Starting...</span>
          {:else}
            <span>Errored</span>
          {/if}
        </div>
      {/if}

      {#each endpoints as { kind, host, port, title }, i}
        {@const url = formatEndpoint(kind, host, port)}
        {@const label = title ?? (endpoints.length > 1 ? `Endpoint ${i + 1}` : 'Endpoint')}
        <div class="space-y-1">
          <div class="text-foreground-l3 flex justify-between text-sm">
            <span>{label}</span>
            <span>{kind === ExposeKind.TCP_SSL ? 'TCP+SSL' : kind}</span>
          </div>
          <button
            type="button"
            class="group bg-background-l4 flex w-full items-center justify-between gap-2 rounded-md px-3 py-2"
            onclick={() => copy(url)}
          >
            <span class="text-foreground-accent truncate font-mono text-sm">{url}</span>
            <IconCopy class="text-foreground-l4 hover:text-foreground-l2 size-4 shrink-0" />
          </button>
        </div>
      {/each}

      {#if timeLeft !== null}
        <div class="mt-auto space-y-1.5">
          <Progress value={timeLeft} max={instanceLifetime} class="h-1.5" />
          <p class="text-foreground-l3 text-center text-sm">
            {formatCountdown(timeLeft)} remaining
          </p>
        </div>
      {/if}

      <div class="flex gap-2">
        <Button
          variant="secondary"
          onclick={extend}
          disabled={actioning || status === InstanceStatus.STARTING}
          class="flex-1"
        >
          {#if actioning}<IconLoader class="animate-spin" />{/if}
          Extend
        </Button>
        <Button
          variant="destructive"
          onclick={stop}
          disabled={actioning || status === InstanceStatus.STARTING}
          class="flex-1"
        >
          {#if actioning}<IconLoader class="animate-spin" />{/if}
          Stop
        </Button>
      </div>
      <CaptchaNotice config={clientConfig} action={ProtectedAction.InstancerStart} class="mt-2" />
    </div>
  {/if}
</div>

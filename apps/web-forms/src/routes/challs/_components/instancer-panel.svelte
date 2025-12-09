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

  function formatEndpoint(kind: ExposeKind, host: string, port: number): string {
    if (kind === ExposeKind.HTTP) return port === 80 ? `http://${host}` : `http://${host}:${port}`
    if (kind === ExposeKind.HTTPS)
      return port === 443 ? `https://${host}` : `https://${host}:${port}`
    if (kind === ExposeKind.TCP) return `nc ${host} ${port}`
    return `ncat --ssl ${host} ${port}`
  }

  function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      alert('Copied to clipboard')
    } catch {
      alert('Failed to copy')
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
      alert('Instance started')
    } else if (res.kind === 'badInstancerError') {
      alert(res.data.message)
    } else {
      alert(res.message)
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
      alert('Instance stopped')
    } else if (res.kind === 'badInstancerError') {
      alert(res.data.message)
    } else {
      alert(res.message)
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
      alert('Instance extended')
    } else if (res.kind === 'badInstancerError') {
      alert(res.data.message)
    } else {
      alert(res.message)
    }
    actioning = false
  }

  $effect(() => {
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

<fieldset>
  <legend>Instance</legend>

  {#if loading}
    <p>Loading instance status...</p>
  {:else if error}
    <p style="color: red;">{error}</p>
    <button type="button" onclick={fetchStatus}>Retry</button>
  {:else if status === InstanceStatus.STOPPED}
    <p>No instance running.</p>
    <button type="button" onclick={start} disabled={actioning}>
      {actioning ? 'Starting...' : 'Start Instance'}
    </button>
  {:else}
    {#if status === InstanceStatus.STARTING}
      <p><em>Starting instance...</em></p>
    {:else if status === InstanceStatus.ERRORED}
      <p style="color: red;"><em>Instance errored</em></p>
    {/if}

    {#if endpoints.length > 0}
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Endpoint</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each endpoints as { kind, host, port }}
            {@const url = formatEndpoint(kind, host, port)}
            <tr>
              <td>{kind === ExposeKind.TCP_SSL ? 'TCP+SSL' : kind.toUpperCase()}</td>
              <td><code>{url}</code></td>
              <td>
                <button type="button" onclick={() => copy(url)}>Copy</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}

    {#if timeLeft !== null}
      <p>
        Time remaining: <strong>{formatTime(timeLeft)}</strong>
        <progress value={timeLeft} max={120000}></progress>
      </p>
    {/if}

    <div>
      <button
        type="button"
        onclick={extend}
        disabled={actioning || status === InstanceStatus.STARTING}
      >
        {actioning ? 'Extending...' : 'Extend'}
      </button>
      <button
        type="button"
        onclick={stop}
        disabled={actioning || status === InstanceStatus.STARTING}
      >
        {actioning ? 'Stopping...' : 'Stop'}
      </button>
    </div>
  {/if}
</fieldset>

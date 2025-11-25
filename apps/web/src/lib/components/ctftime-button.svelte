<script lang="ts">
  import { CtftimeCallbackRoute, GoodCtftimeToken } from '@rctf/types'
  import { apiRequest, toast } from '$lib'
  import CtftimeIcon from '$lib/assets/ctftime.svg?raw'
  import { onDestroy, onMount } from 'svelte'
  import { Spinner } from './ui/spinner'

  interface Props {
    clientId: string
    onCtftimeDone: (data: {
      ctftimeToken: string
      ctftimeName: string
      ctftimeId: string
    }) => void
    disabled?: boolean
  }

  let { clientId, onCtftimeDone, disabled = false }: Props = $props()

  let loading = $state(false)
  let oauthState: string | null = null

  function getState(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(v => v.toString(16).padStart(2, '0'))
      .join('')
  }

  function openPopup() {
    const state = getState()
    oauthState = state

    const w = 600
    const h = 500
    const systemZoom = window.innerWidth / window.screen.availWidth
    const left = (window.innerWidth - w) / 2 / systemZoom + window.screenLeft
    const top = (window.innerHeight - h) / 2 / systemZoom + window.screenTop

    const url =
      'https://oauth.ctftime.org/authorize' +
      `?scope=${encodeURIComponent('team:read')}` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(`${location.origin}/integrations/ctftime/callback`)}` +
      `&state=${encodeURIComponent(state)}`

    const popup = window.open(
      url,
      'CTFtime',
      [
        'scrollbars',
        'resizable',
        `width=${w / systemZoom}`,
        `height=${h / systemZoom}`,
        `top=${top}`,
        `left=${left}`,
      ].join(',')
    )
    popup?.focus()
  }

  async function handlePostMessage(evt: MessageEvent) {
    if (evt.origin !== location.origin || evt.data.kind !== 'ctftimeCallback') {
      return
    }
    if (oauthState === null || evt.data.state !== oauthState) {
      return
    }

    loading = true

    const response = await apiRequest(CtftimeCallbackRoute, {
      ctftimeCode: evt.data.ctftimeCode,
    })

    if (response.kind === GoodCtftimeToken.kind) {
      onCtftimeDone({
        ctftimeToken: response.data.ctftimeToken,
        ctftimeName: response.data.ctftimeName,
        ctftimeId: response.data.ctftimeId,
      })
    } else {
      toast.error(response.message)
    }

    loading = false
    oauthState = null
  }

  onMount(() => {
    window.addEventListener('message', handlePostMessage)
  })

  onDestroy(() => {
    window.removeEventListener('message', handlePostMessage)
  })
</script>

<button
  type="button"
  class="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[#222] px-4 py-2 text-white transition-colors hover:bg-[#333] disabled:cursor-not-allowed disabled:opacity-50"
  onclick={openPopup}
  disabled={disabled || loading}
>
  {#if loading}
    <Spinner class="size-4" />
    <span>Connecting...</span>
  {:else}
    <span class="inline-flex h-5 items-center [&>svg]:h-full [&>svg]:w-auto">
      {@html CtftimeIcon}
    </span>
  {/if}
</button>

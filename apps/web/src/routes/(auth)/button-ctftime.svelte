<script lang="ts">
  import { CtftimeCallbackRoute, GoodCtftimeToken } from '@rctf/types'
  import { apiRequest, showApiError } from '$lib/api'
  import ctftimeLogo from '$lib/assets/ctftime.svg'
  import Button from '$lib/ui/button.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { createAsyncAction } from '$lib/utils/async-action.svelte'

  type CtftimeData = {
    ctftimeToken: string
    ctftimeName: string
    ctftimeId: string
  }

  type Props = {
    clientId: string
    onCtftimeDone: (data: CtftimeData) => void
    disabled?: boolean
  }

  let { clientId, onCtftimeDone, disabled = false }: Props = $props()

  let oauthState: string | null = null
  const exchangeAction = createAsyncAction()

  function openPopup() {
    const state = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(value => value.toString(16).padStart(2, '0'))
      .join('')
    oauthState = state

    const width = 600
    const height = 500
    const systemZoom = window.innerWidth / window.screen.availWidth
    const left = (window.innerWidth - width) / 2 / systemZoom + window.screenLeft
    const top = (window.innerHeight - height) / 2 / systemZoom + window.screenTop

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
        `width=${width / systemZoom}`,
        `height=${height / systemZoom}`,
        `top=${top}`,
        `left=${left}`,
      ].join(',')
    )
    popup?.focus()
  }

  async function handleMessage(event: MessageEvent) {
    if (event.origin !== location.origin || event.data?.kind !== 'ctftimeCallback') return
    if (oauthState === null || event.data.state !== oauthState) return
    oauthState = null

    const ctftimeCode = event.data.ctftimeCode
    if (typeof ctftimeCode !== 'string') return

    await exchangeAction.run(
      async () => {
        const response = await apiRequest(CtftimeCallbackRoute, { ctftimeCode })
        if (response.kind === GoodCtftimeToken.kind) {
          onCtftimeDone(response.data)
        } else {
          showApiError(response)
        }
      },
      { errorMessage: 'CTFtime login failed' }
    )
  }
</script>

<svelte:window onmessage={handleMessage} />

<ctftime-button>
  <Button
    type="button"
    variant="outline"
    size="lg"
    onclick={openPopup}
    disabled={disabled || exchangeAction.pending}
    aria-label="Login with CTFtime"
  >
    {#if exchangeAction.pending}
      <Spinner />
      <span>Connecting...</span>
    {:else}
      <img src={ctftimeLogo} alt="CTFtime" />
    {/if}
  </Button>
</ctftime-button>

<style>
  ctftime-button {
    display: block;

    :global(button) {
      inline-size: 100%;
    }

    img {
      block-size: 1.5rem;
    }
  }
</style>

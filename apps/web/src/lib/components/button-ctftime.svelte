<script lang="ts">
  import { GoodCtftimeToken } from '@rctf/types'
  import { toast } from '$lib'
  import CtftimeIcon from '$lib/assets/ctftime.svg?raw'
  import { Button, Spinner } from '$lib/components'
  import { useCtftimeCallbackMutation } from '$lib/query'
  import { onDestroy, onMount } from 'svelte'

  interface Props {
    clientId: string
    onCtftimeDone: (data: { ctftimeToken: string; ctftimeName: string; ctftimeId: string }) => void
    disabled?: boolean
  }

  let { clientId, onCtftimeDone, disabled = false }: Props = $props()

  const ctftimeMutation = useCtftimeCallbackMutation()

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

  function handlePostMessage(evt: MessageEvent) {
    if (evt.origin !== location.origin || evt.data.kind !== 'ctftimeCallback') {
      return
    }
    if (oauthState === null || evt.data.state !== oauthState) {
      return
    }

    $ctftimeMutation.mutate(
      { ctftimeCode: evt.data.ctftimeCode },
      {
        onSuccess: response => {
          if (response.kind === GoodCtftimeToken.kind) {
            onCtftimeDone({
              ctftimeToken: response.data.ctftimeToken,
              ctftimeName: response.data.ctftimeName,
              ctftimeId: response.data.ctftimeId,
            })
          } else {
            toast.error(response.message)
          }
          oauthState = null
        },
        onError: error => {
          toast.error(error.message)
          oauthState = null
        },
      }
    )
  }

  onMount(() => {
    window.addEventListener('message', handlePostMessage)
  })

  onDestroy(() => {
    window.removeEventListener('message', handlePostMessage)
  })
</script>

<Button
  type="button"
  variant="outline"
  size="lg"
  class="w-full [&_svg:not([class*='size-'])]:w-auto [&_svg:not([class*='size-'])]:h-6 py-0"
  onclick={openPopup}
  disabled={disabled || $ctftimeMutation.isPending}
>
  {#if $ctftimeMutation.isPending}
    <Spinner class="size-4" />
    <span>Connecting...</span>
  {:else}
    <span class="inline-flex">
      {@html CtftimeIcon}
    </span>
  {/if}
</Button>

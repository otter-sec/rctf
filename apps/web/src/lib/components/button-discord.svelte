<script lang="ts">
  import { GoodDiscordTokenV2 } from '@rctf/types'
  import { toast } from '$lib'
  import DiscordIcon from '$lib/assets/discord.svg?raw'
  import { Button, Spinner } from '$lib/components'
  import { useDiscordCallbackMutation } from '$lib/query'
  import { onDestroy, onMount } from 'svelte'

  interface Props {
    clientId: string
    onDiscordDone: (data: {
      discordToken: string
      discordName: string
      discordId: string
    }) => void
    disabled?: boolean
  }

  let { clientId, onDiscordDone, disabled = false }: Props = $props()

  const discordMutation = useDiscordCallbackMutation()

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
      'https://discord.com/oauth2/authorize' +
      `?scope=${encodeURIComponent('identify email')}` +
      `&response_type=code` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(`${location.origin}/integrations/discord/callback`)}` +
      `&state=${encodeURIComponent(state)}`

    const popup = window.open(
      url,
      'Discord',
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
    if (evt.origin !== location.origin || evt.data.kind !== 'discordCallback') {
      return
    }
    if (oauthState === null || evt.data.state !== oauthState) {
      return
    }

    $discordMutation.mutate(
      { discordCode: evt.data.discordCode },
      {
        onSuccess: response => {
          if (response.kind === GoodDiscordTokenV2.kind) {
            onDiscordDone({
              discordToken: response.data.discordToken,
              discordName: response.data.discordName,
              discordId: response.data.discordId,
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
  disabled={disabled || $discordMutation.isPending}
>
  {#if $discordMutation.isPending}
    <Spinner class="size-4" />
    <span>Connecting...</span>
  {:else}
    <span class="inline-flex">
      {@html DiscordIcon}
    </span>
  {/if}
</Button>

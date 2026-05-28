<script lang="ts">
  import { BadAlreadySolvedChallenge, GoodFlag, SubmitFlagRoute } from '@rctf/types'
  import type { Challenge } from '@rctf/types'
  import { isAuthenticated, showApiError } from '$lib/api'
  import { Button, Input, Spinner } from '$lib/components'
  import { useApiForm } from '$lib/forms'
  import { IconCheck, IconClockFilled, IconLogin, IconSend } from '$lib/icons'
  import { useClientConfig } from '$lib/query'
  import { toast } from 'svelte-sonner'

  interface Props {
    challenge: Challenge
    isSolved: boolean
    onSolve: (challengeId: string) => void
  }

  let { challenge, isSolved, onSolve }: Props = $props()

  const clientConfigQuery = useClientConfig()
  const clientConfig = $derived(clientConfigQuery.data)
  const isArchived = $derived(clientConfig?.isArchived ?? false)
  const isCtfEnded = $derived(clientConfig ? Date.now() > clientConfig.endTime : false)

  const form = useApiForm(SubmitFlagRoute, {
    onSuccess: response => {
      if (response.kind === GoodFlag.kind) {
        toast.success('Flag correct!')
        onSolve(challenge.id)
        form.setData({ flag: '' })
      } else if (response.kind === BadAlreadySolvedChallenge.kind) {
        toast.info('You already solved this challenge')
        onSolve(challenge.id)
      }
    },
    onError: response => {
      showApiError(response)
    },
  })

  $effect(() => {
    form.data.id = challenge.id
  })

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault()

    const flag = (form.data.flag ?? '').trim()
    if (!flag) {
      return
    }

    form.setData({ flag })
    form.submit()
  }
</script>

{#if isArchived}
  <div class="flex h-12 gap-2">
    <div
      class="bg-background-l4 text-foreground-l3 flex h-full min-w-0 flex-1 items-center gap-3 rounded-lg px-3"
    >
      <IconClockFilled class="size-6 shrink-0" />
      <span class="truncate text-xl">The CTF is archived.</span>
    </div>
  </div>
{:else if isCtfEnded}
  <div class="flex h-12 gap-2">
    <div
      class="bg-background-l4 text-foreground-l3 flex h-full min-w-0 flex-1 items-center gap-3 rounded-lg px-3"
    >
      <IconClockFilled class="size-6 shrink-0" />
      <span class="truncate text-xl">The CTF has ended.</span>
    </div>
  </div>
{:else if !isAuthenticated()}
  <Button href="/login" class="h-12 gap-2 text-xl">
    <IconLogin class="size-5" />
    Login to submit
  </Button>
{:else}
  <form class="flex flex-col gap-2" onsubmit={handleSubmit}>
    <div class="flex h-12 gap-2">
      {#if isSolved}
        <div
          class="bg-background-success text-foreground-success flex h-full min-w-0 flex-1 items-center gap-3 rounded-lg px-3"
        >
          <IconCheck class="size-6 shrink-0" />
          <span class="truncate text-xl">Challenge solved!</span>
        </div>
      {:else}
        <Input
          type="text"
          placeholder={clientConfig?.flagFormatPlaceholder ?? 'flag{...}'}
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          class="text-foreground-l3 h-full min-w-0 flex-1 rounded-lg border-transparent py-3.5 font-mono text-xl!"
          bind:value={form.data.flag}
          disabled={form.submitting}
          aria-invalid={!!form.errors._form || undefined}
        />
      {/if}
      <button
        type="submit"
        disabled={form.submitting || isSolved}
        class="bg-background-l4 text-foreground-l4 hover:enabled:bg-background-l5 focus-visible:ring-ring/50 flex h-full items-center justify-center rounded-lg px-4 py-3 outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {#if form.submitting}
          <Spinner class="size-6" />
        {:else}
          <IconSend class="size-6" />
        {/if}
      </button>
    </div>
  </form>
{/if}

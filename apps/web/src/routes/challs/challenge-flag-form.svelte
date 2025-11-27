<script lang="ts">
  import {
    BadAlreadySolvedChallenge,
    GoodFlag,
    SubmitFlagRoute,
  } from '@rctf/types'
  import { invalidateAll } from '$app/navigation'
  import { apiRequest, toast } from '$lib'
  import type { Challenge } from '$lib/api'
  import { Spinner } from '$lib/components'
  import { IconCheck, IconSend } from '$lib/icons'

  type Props = {
    challenge: Challenge
    isSolved: boolean
    onSolve: (challengeId: string) => void
  }

  let { challenge, isSolved, onSolve }: Props = $props()

  let flagInput = $state('')
  let submitting = $state(false)
  let error = $state('')

  async function handleSubmitFlag(e: SubmitEvent) {
    e.preventDefault()

    const flag = flagInput.trim()
    if (!flag) {
      error = 'Please enter a flag'
      return
    }

    submitting = true
    error = ''

    const response = await apiRequest(SubmitFlagRoute, {
      id: challenge.id,
      flag,
    })

    submitting = false

    if (response.kind === GoodFlag.kind) {
      toast.success('Flag correct!')
      onSolve(challenge.id)
      flagInput = ''
      invalidateAll()
    } else if (response.kind === BadAlreadySolvedChallenge.kind) {
      toast.info('You already solved this challenge')
      onSolve(challenge.id)
    } else {
      error = response.message
      toast.error(response.message)
    }
  }
</script>

<form class="flex flex-col gap-2" onsubmit={handleSubmitFlag}>
  <div class="flex h-12 gap-2">
    {#if isSolved}
      <div
        class="flex h-full flex-1 items-center gap-3 rounded-lg bg-background-success px-3 text-foreground-success"
      >
        <IconCheck class="size-6" />
        <span class="text-xl">Challenge solved!</span>
      </div>
    {:else}
      <input
        type="text"
        placeholder={'flag{...}'}
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        class="h-full flex-1 rounded-lg bg-background-l4 px-3 py-3.5 font-mono text-xl text-foreground-l3 placeholder:text-foreground-l3 outline-none"
        bind:value={flagInput}
        disabled={submitting}
        aria-invalid={!!error || undefined}
      />
    {/if}
    <button
      type="submit"
      disabled={submitting || isSolved}
      class="flex h-full items-center justify-center rounded-lg bg-background-l4 px-4 py-3 text-foreground-l4 hover:bg-background-l5 disabled:opacity-50"
    >
      {#if submitting}
        <Spinner class="size-6" />
      {:else}
        <IconSend class="size-6" />
      {/if}
    </button>
  </div>
  {#if error}
    <p class="text-sm text-foreground-destructive" role="alert">
      {error}
    </p>
  {/if}
</form>

<script lang="ts">
  import Icon from '@iconify/svelte'
  import {
    BadAlreadySolvedChallenge,
    GoodFlag,
    SubmitFlagRoute,
  } from '@rctf/types'
  import { invalidateAll } from '$app/navigation'
  import { apiRequest, toast } from '$lib'
  import type { Challenge } from '$lib/api'
  import { Button, Input, Spinner } from '$lib/components'

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

<div class="px-6 py-4">
  {#if isSolved}
    <div class="flex items-center gap-2 text-foreground-success">
      <Icon icon="tabler:circle-check-filled" class="size-5" />
      <span class="font-medium">Challenge solved!</span>
    </div>
  {:else}
    <form class="flex flex-col gap-3" onsubmit={handleSubmitFlag}>
      <div class="flex gap-2">
        <Input
          type="text"
          placeholder={'flag{...}'}
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          class="flex-1 font-mono"
          bind:value={flagInput}
          disabled={submitting}
          aria-invalid={!!error}
        />
        <Button type="submit" disabled={submitting}>
          {#if submitting}
            <Spinner class="size-4" />
          {/if}
          Submit
        </Button>
      </div>
      {#if error}
        <p class="text-sm text-foreground-destructive" role="alert">
          {error}
        </p>
      {/if}
    </form>
  {/if}
</div>

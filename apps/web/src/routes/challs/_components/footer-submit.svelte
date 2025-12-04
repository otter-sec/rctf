<script lang="ts">
  import { BadAlreadySolvedChallenge, GoodFlag } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { toast } from '$lib'
  import type { Challenge } from '$lib/api'
  import { Spinner } from '$lib/components'
  import { IconCheck, IconSend } from '$lib/icons'
  import { queryKeys, useSubmitFlagMutation } from '$lib/query'

  interface Props {
    challenge: Challenge
    isSolved: boolean
    onSolve: (challengeId: string) => void
  }

  let { challenge, isSolved, onSolve }: Props = $props()

  const queryClient = useQueryClient()
  const submitMutation = useSubmitFlagMutation()

  let flagInput = $state('')
  let error = $state('')

  async function handleSubmitFlag(e: SubmitEvent) {
    e.preventDefault()

    const flag = flagInput.trim()
    if (!flag) {
      error = 'Please enter a flag'
      return
    }

    error = ''

    $submitMutation.mutate(
      { id: challenge.id, flag },
      {
        onSuccess: response => {
          if (response.kind === GoodFlag.kind) {
            toast.success('Flag correct!')
            onSolve(challenge.id)
            flagInput = ''
            queryClient.invalidateQueries({ queryKey: queryKeys.challenges })
            queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
            queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
          } else if (response.kind === BadAlreadySolvedChallenge.kind) {
            toast.info('You already solved this challenge')
            onSolve(challenge.id)
          } else {
            error = response.message
            toast.error(response.message)
          }
        },
        onError: err => {
          error = err.message
          toast.error(err.message)
        },
      }
    )
  }
</script>

<form class="flex flex-col gap-2" onsubmit={handleSubmitFlag}>
  <div class="flex h-12 gap-2">
    {#if isSolved}
      <div
        class="flex h-full flex-1 items-center gap-3 rounded-lg bg-background-success px-3 text-foreground-success">
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
        disabled={$submitMutation.isPending}
        aria-invalid={!!error || undefined} />
    {/if}
    <button
      type="submit"
      disabled={$submitMutation.isPending || isSolved}
      class="flex h-full items-center justify-center rounded-lg bg-background-l4 px-4 py-3 text-foreground-l4 hover:bg-background-l5 disabled:opacity-50">
      {#if $submitMutation.isPending}
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

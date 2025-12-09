<script lang="ts">
  import { BadAlreadySolvedChallenge, GoodFlag, SubmitFlagRoute } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { toast } from '$lib'
  import type { Challenge } from '$lib/api'
  import { Spinner } from '$lib/components'
  import { useApiForm } from '$lib/forms'
  import { IconCheck, IconSend } from '$lib/icons'
  import { queryKeys } from '$lib/query'

  interface Props {
    challenge: Challenge
    isSolved: boolean
    onSolve: (challengeId: string) => void
  }

  let { challenge, isSolved, onSolve }: Props = $props()

  const queryClient = useQueryClient()

  const form = useApiForm(SubmitFlagRoute, {
    onSuccess: response => {
      if (response.kind === GoodFlag.kind) {
        toast.success('Flag correct!')
        onSolve(challenge.id)
        form.setData({ flag: '' })
        queryClient.invalidateQueries({ queryKey: queryKeys.challenges })
        queryClient.invalidateQueries({ queryKey: queryKeys.userSelf })
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] })
      } else if (response.kind === BadAlreadySolvedChallenge.kind) {
        toast.info('You already solved this challenge')
        onSolve(challenge.id)
      }
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

<form class="flex flex-col gap-2" onsubmit={handleSubmit}>
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
        bind:value={form.data.flag}
        disabled={form.submitting}
        aria-invalid={!!form.errors._form || undefined} />
    {/if}
    <button
      type="submit"
      disabled={form.submitting || isSolved}
      class="flex h-full items-center justify-center rounded-lg bg-background-l4 px-4 py-3 text-foreground-l4 hover:bg-background-l5 disabled:opacity-50">
      {#if form.submitting}
        <Spinner class="size-6" />
      {:else}
        <IconSend class="size-6" />
      {/if}
    </button>
  </div>
  {#if form.errors._form}
    <p class="text-sm text-foreground-destructive" role="alert">
      {form.errors._form}
    </p>
  {/if}
</form>

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
  import {
    Badge,
    Button,
    EmptyState,
    Input,
    ScrollArea,
    Separator,
    Spinner,
  } from '$lib/components'
  import { marked } from 'marked'
  import SolvesDialog from './solves-dialog.svelte'

  type Props = {
    challenge: Challenge | null
    isSolved: boolean
    onSolve: (challengeId: string) => void
  }

  let { challenge, isSolved, onSolve }: Props = $props()

  let flagInput = $state('')
  let submitting = $state(false)
  let error = $state('')

  $effect(() => {
    if (challenge) {
      flagInput = ''
      error = ''
    }
  })

  async function handleSubmitFlag(e: SubmitEvent) {
    e.preventDefault()
    if (!challenge) return

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

{#if challenge}
  <div class="flex h-full flex-col">
    <div class="flex items-start justify-between gap-4 border-b px-6 py-4">
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2">
          {#if isSolved}
            <Icon
              icon="tabler:circle-check-filled"
              class="size-5 text-foreground-success"
            />
          {/if}
          <h2 class="text-xl font-semibold">{challenge.name}</h2>
        </div>
        <p class="text-foreground-l3 text-sm">by {challenge.author}</p>
      </div>
      <div class="flex items-center gap-3">
        {#if challenge.points !== null}
          <Badge variant="secondary" class="text-base">
            {challenge.points.toLocaleString()} pts
          </Badge>
        {/if}
      </div>
    </div>

    <ScrollArea class="flex-1 px-6 py-4">
      <div class="flex flex-col gap-6">
        <div class="prose prose-sm dark:prose-invert max-w-none">
          {@html marked(challenge.description)}
        </div>

        {#if challenge.files.length > 0}
          <div class="flex flex-col gap-2">
            <h3 class="text-sm font-medium">Files</h3>
            <div class="flex flex-wrap gap-2">
              {#each challenge.files as file}
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1.5 rounded-md border bg-background-l1 px-3 py-1.5 text-sm transition-colors hover:bg-background-l2"
                >
                  {file.name}
                </a>
              {/each}
            </div>
          </div>
        {/if}

        {#if challenge.solves !== null}
          <div class="flex items-center gap-4 text-sm">
            <SolvesDialog
              challengeId={challenge.id}
              challengeName={challenge.name}
              solveCount={challenge.solves}
            />
          </div>
        {/if}
      </div>
    </ScrollArea>

    <Separator />

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
  </div>
{:else}
  <EmptyState
    icon="tabler:flag-filled"
    title="Select a challenge"
    subtitle="Choose a challenge from the list to view details"
    class="h-full"
  />
{/if}

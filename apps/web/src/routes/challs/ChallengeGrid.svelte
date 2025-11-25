<script lang="ts">
  import { invalidateAll } from '$app/navigation'
  import {
    SubmitFlagRoute,
    GoodFlag,
    BadAlreadySolvedChallenge,
  } from '@rctf/types'
  import { apiRequest, toast } from '$lib'
  import type { Challenge, Solve } from '$lib/api'
  import { marked } from 'marked'
  import Check from '@lucide/svelte/icons/check'
  import { Button } from '$lib/components/ui/button'
  import { Badge } from '$lib/components/ui/badge'
  import { Input } from '$lib/components/ui/input'
  import { Spinner } from '$lib/components/ui/spinner'
  import * as Card from '$lib/components/ui/card'
  import SolvesDialog from './SolvesDialog.svelte'

  let {
    challenges,
    solves = [],
  }: { challenges: Challenge[]; solves: Solve[] } = $props()

  let localSolvedIds = $state(new Set<string>())
  const solvedIds = $derived(
    new Set([...solves.map(s => s.id), ...localSolvedIds])
  )

  let flagInputs = $state<Record<string, string>>({})
  let submitting = $state<Record<string, boolean>>({})
  let errors = $state<Record<string, string>>({})

  const groups = $derived.by(() => {
    const grouped = new Map<string, Challenge[]>()
    for (const challenge of challenges) {
      const category = challenge.category
      if (!grouped.has(category)) {
        grouped.set(category, [])
      }
      grouped.get(category)!.push(challenge)
    }
    for (const challs of grouped.values()) {
      challs.sort((a, b) => {
        if (a.solves !== b.solves) {
          return (b.solves ?? 0) - (a.solves ?? 0)
        }
        return (b.sortWeight ?? 0) - (a.sortWeight ?? 0)
      })
    }
    return Array.from(grouped.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    )
  })

  const stats = $derived({
    total: challenges.length,
    solved: challenges.filter(c => solvedIds.has(c.id)).length,
  })

  async function handleSubmitFlag(challengeId: string, e: SubmitEvent) {
    e.preventDefault()

    const flag = flagInputs[challengeId]?.trim()
    if (!flag) {
      errors[challengeId] = 'Please enter a flag'
      return
    }

    submitting[challengeId] = true
    errors[challengeId] = ''

    const response = await apiRequest(SubmitFlagRoute, {
      id: challengeId,
      flag,
    })

    submitting[challengeId] = false

    if (response.kind === GoodFlag.kind) {
      toast.success('Flag correct!')
      localSolvedIds.add(challengeId)
      localSolvedIds = new Set(localSolvedIds)
      flagInputs[challengeId] = ''
      invalidateAll()
    } else if (response.kind === BadAlreadySolvedChallenge.kind) {
      toast.info('You already solved this challenge')
      localSolvedIds.add(challengeId)
      localSolvedIds = new Set(localSolvedIds)
    } else {
      errors[challengeId] = response.message
      toast.error(response.message)
    }
  }
</script>

<div class="flex flex-col gap-6">
  <p class="text-muted-foreground">
    {stats.solved} / {stats.total} solved
  </p>

  {#each groups as [category, entries] (category)}
    {@const categorySolved = entries.filter(c => solvedIds.has(c.id)).length}
    <section class="flex flex-col gap-4">
      <header class="flex items-center justify-between border-b pb-2">
        <h3 class="text-lg font-semibold">{category}</h3>
        <span class="text-muted-foreground text-sm">
          {categorySolved}/{entries.length}
        </span>
      </header>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {#each entries as challenge (challenge.id)}
          {@const isSolved = solvedIds.has(challenge.id)}
          {@const isSubmitting = submitting[challenge.id] ?? false}
          {@const error = errors[challenge.id]}

          <Card.Root
            class={isSolved
              ? 'border-green-600/50 bg-green-950/10 dark:border-green-500/30 dark:bg-green-950/20'
              : ''}
          >
            <Card.Header class="pb-3">
              <div class="flex items-start justify-between gap-3">
                <div class="flex flex-col gap-1">
                  <Card.Title class="flex items-center gap-2">
                    {#if isSolved}
                      <Check
                        size={16}
                        class="text-green-600 dark:text-green-500"
                        aria-label="Solved"
                      />
                    {/if}
                    {challenge.name}
                  </Card.Title>
                  <Card.Description>by {challenge.author}</Card.Description>
                </div>
                {#if challenge.points !== null}
                  <Badge variant="secondary">
                    {challenge.points.toLocaleString()} pts
                  </Badge>
                {/if}
              </div>
            </Card.Header>

            <Card.Content class="pb-3">
              <div class="prose prose-sm dark:prose-invert max-w-none">
                {@html marked(challenge.description)}
              </div>
            </Card.Content>

            <Card.Footer class="flex-col items-stretch gap-3">
              <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                {#if challenge.solves !== null}
                  <SolvesDialog
                    challengeId={challenge.id}
                    challengeName={challenge.name}
                    solveCount={challenge.solves}
                  />
                {/if}

                {#if challenge.files.length > 0}
                  <span class="flex items-center gap-2">
                    <span class="text-muted-foreground">Files:</span>
                    {#each challenge.files as file, i}
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-primary hover:underline"
                      >
                        {file.name}</a
                      >{#if i < challenge.files.length - 1}<span
                          class="text-muted-foreground">,</span
                        >{/if}
                    {/each}
                  </span>
                {/if}
              </div>

              {#if !isSolved}
                <form
                  class="flex gap-2"
                  onsubmit={e => handleSubmitFlag(challenge.id, e)}
                >
                  <Input
                    type="text"
                    placeholder={'flag{...}'}
                    autocomplete="off"
                    autocorrect="off"
                    spellcheck="false"
                    class="flex-1 font-mono"
                    bind:value={flagInputs[challenge.id]}
                    disabled={isSubmitting}
                    aria-invalid={!!error}
                  />
                  <Button type="submit" disabled={isSubmitting}>
                    {#if isSubmitting}
                      <Spinner class="size-4" />
                    {/if}
                    Submit
                  </Button>
                </form>
                {#if error}
                  <p class="text-sm text-destructive" role="alert">{error}</p>
                {/if}
              {:else}
                <p class="flex items-center gap-1 text-sm text-green-600 dark:text-green-500">
                  <Check size={16} /> Solved
                </p>
              {/if}
            </Card.Footer>
          </Card.Root>
        {/each}
      </div>
    </section>
  {/each}
</div>

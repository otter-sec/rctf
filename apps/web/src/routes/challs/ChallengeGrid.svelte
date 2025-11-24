<script lang="ts">
  import type { Challenge } from '$lib/types'
  import { marked } from 'marked'

  let { challenges }: { challenges: Challenge[] } = $props()

  const groups = $derived.by(() => {
    const grouped = new Map<string, Challenge[]>()
    for (const challenge of challenges) {
      const category = challenge.category
      if (!grouped.has(category)) {
        grouped.set(category, [])
      }
      grouped.get(category)!.push(challenge)
    }
    return Array.from(grouped.entries())
  })
</script>

<div class="flex flex-col gap-6">
  {#each groups as [category, entries] (category)}
    <article class="flex flex-col gap-3">
      <h3>{category}</h3>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        {#each entries as challenge (challenge.id)}
          <div class="border p-3 flex flex-col gap-2">
            <div class="flex items-start justify-between gap-2">
              <h4>{challenge.name}</h4>
              {#if challenge.points !== null}
                <span>{challenge.points.toLocaleString()} pts</span>
              {/if}
            </div>
            <p>by {challenge.author}</p>
            <p class="whitespace-pre-line">{@html marked.parse(challenge.description)}</p>
            <div class="flex gap-4">
              {#if challenge.solves !== null}
                <span>{challenge.solves} solves</span>
              {/if}
              {#if challenge.files.length > 0}
                <span
                  >{challenge.files.length} file{challenge.files.length !== 1
                    ? 's'
                    : ''}</span
                >
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </article>
  {/each}
</div>

<script lang="ts">
  import type { Challenge, Solve } from '$lib/api'
  import { marked } from 'marked'

  let {
    challenges,
    solves = [],
  }: { challenges: Challenge[]; solves: Solve[] } = $props()

  const solvedIds = $derived(new Set(solves.map(s => s.id)))

  const groups = $derived.by(() => {
    const grouped = new Map<string, Challenge[]>()
    for (const challenge of challenges) {
      const category = challenge.category
      if (!grouped.has(category)) {
        grouped.set(category, [])
      }
      grouped.get(category)!.push(challenge)
    }
    // Sort challenges within each category by points
    for (const challs of grouped.values()) {
      challs.sort((a, b) => (a.points ?? 0) - (b.points ?? 0))
    }
    return Array.from(grouped.entries()).sort((a, b) =>
      a[0].localeCompare(b[0])
    )
  })

  const stats = $derived({
    total: challenges.length,
    solved: challenges.filter(c => solvedIds.has(c.id)).length,
  })
</script>

<div class="flex flex-col gap-6">
  <p>
    {stats.solved} / {stats.total} solved
  </p>

  {#each groups as [category, entries] (category)}
    {@const categorySolved = entries.filter(c => solvedIds.has(c.id)).length}
    <article class="flex flex-col gap-3">
      <h3>
        {category}
        <small>({categorySolved}/{entries.length})</small>
      </h3>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        {#each entries as challenge (challenge.id)}
          {@const isSolved = solvedIds.has(challenge.id)}
          <div class="flex flex-col gap-2">
            <div class="flex items-start justify-between gap-2">
              <h4>
                {#if isSolved}
                  <span aria-label="Solved">✓</span>
                {/if}
                {challenge.name}
              </h4>
              {#if challenge.points !== null}
                <span>{challenge.points.toLocaleString()} pts</span>
              {/if}
            </div>
            <p><small>by {challenge.author}</small></p>
            <div>
              {@html marked.parse(challenge.description)}
            </div>
            <p>
              <small>
                {#if challenge.solves !== null}
                  {challenge.solves} solve{challenge.solves !== 1 ? 's' : ''}
                {/if}
                {#if challenge.files.length > 0}
                  •
                  {#each challenge.files as file, i}
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {file.name}</a
                    >{#if i < challenge.files.length - 1}, {/if}
                  {/each}
                {/if}
              </small>
            </p>
          </div>
        {/each}
      </div>
    </article>
  {/each}
</div>

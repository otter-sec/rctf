<script lang="ts">
  import Icon from '@iconify/svelte'
  import type { Challenge } from '$lib/api'
  import { Badge } from '$lib/components'

  type Props = {
    challenge: Challenge
    isSolved: boolean
  }

  let { challenge, isSolved }: Props = $props()
</script>

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

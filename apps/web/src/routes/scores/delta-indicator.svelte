<script lang="ts">
  import { IconTriangleFilled, IconTriangleInvertedFilled } from '$lib/icons'

  interface Props {
    delta: number | undefined | null
    class?: string
  }

  let { delta, class: className = '' }: Props = $props()
</script>

{#if delta && delta > 0}
  <div class="text-foreground-success flex items-center gap-0.5 text-sm tabular-nums {className}">
    <IconTriangleFilled class="size-2.5" />
    <span>{delta}</span>
  </div>
{:else if delta && delta < 0}
  <div
    class="text-foreground-destructive flex items-center gap-0.5 text-sm tabular-nums {className}"
  >
    <IconTriangleInvertedFilled class="size-2.5" />
    <span>{Math.abs(delta)}</span>
  </div>
{/if}

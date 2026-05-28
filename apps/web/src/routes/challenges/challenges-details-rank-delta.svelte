<script lang="ts">
  import { IconTriangleFilled, IconTriangleInvertedFilled } from '$lib/icons'

  interface Props {
    delta: number | undefined | null
  }

  let { delta }: Props = $props()
</script>

{#if delta && delta > 0}
  <span class="text-foreground-success flex items-center gap-0.5 text-xs leading-none tabular-nums">
    <IconTriangleFilled class="size-2 shrink-0" />
    {delta}
  </span>
{:else if delta && delta < 0}
  <span
    class="text-foreground-destructive flex items-center gap-0.5 text-xs leading-none tabular-nums"
  >
    <IconTriangleInvertedFilled class="size-2 shrink-0" />
    {Math.abs(delta)}
  </span>
{/if}

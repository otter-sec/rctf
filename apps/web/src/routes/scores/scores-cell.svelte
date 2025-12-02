<script lang="ts">
  import {
    IconCircle,
    IconCircleDashed,
    IconCircleNumber1Filled,
    IconCircleNumber2Filled,
    IconCircleNumber3Filled,
  } from '$lib/icons'

  interface Props {
    solved: boolean
    bloodIndex: number
  }

  let { solved, bloodIndex }: Props = $props()
</script>

{#if bloodIndex === 0}
  <IconCircleNumber1Filled class="size-7 text-foreground-gold-l0" />
{:else if bloodIndex === 1}
  <IconCircleNumber2Filled class="size-7 text-foreground-silver-l0" />
{:else if bloodIndex === 2}
  <IconCircleNumber3Filled class="size-7 text-foreground-bronze-l0" />
{:else if solved}
  <IconCircle class="size-7 text-foreground-success/75" />
{:else}
  <IconCircleDashed class="size-7 text-foreground-l5/25" />
{/if}


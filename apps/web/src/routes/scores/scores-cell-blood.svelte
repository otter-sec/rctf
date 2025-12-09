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
  <IconCircleNumber1Filled class="text-foreground-gold-l0 size-7" />
{:else if bloodIndex === 1}
  <IconCircleNumber2Filled class="text-foreground-silver-l0 size-7" />
{:else if bloodIndex === 2}
  <IconCircleNumber3Filled class="text-foreground-bronze-l0 size-7" />
{:else if solved}
  <IconCircle class="text-foreground-success/75 size-7" />
{:else}
  <IconCircleDashed class="text-foreground-l5/25 size-7" />
{/if}

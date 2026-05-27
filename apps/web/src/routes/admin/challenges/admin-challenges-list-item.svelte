<script lang="ts">
  import { ChallengeScoringKind, type AdminChallenge } from '@rctf/types'
  import {
    IconChartAreaLineFilled,
    IconCloudComputingFilled,
    IconEyeClosed,
    IconRobot,
  } from '$lib/icons'
  import { cn, getCategoryKeyOrAlias } from '$lib/utils'

  interface Props {
    challenge: AdminChallenge
    category: string
    isSelected: boolean
    onSelect: () => void
  }

  let { challenge, category, isSelected, onSelect }: Props = $props()

  const { name, points, instancerConfig, adminBotConfig, hidden } = $derived(challenge)
  const isDynamic = $derived(challenge.scoring?.kind === ChallengeScoringKind.DYNAMIC)
  const categoryShort = $derived(getCategoryKeyOrAlias(category))
  const hasStatusIcon = $derived(hidden || !!instancerConfig || !!adminBotConfig || isDynamic)
  const pointLabel = $derived(
    points.min === points.max ? `${points.max}` : `${points.min}-${points.max}`
  )
</script>

<li class="border-category-foreground-l1/10 border-b-2 last:border-b-0 @md/list:border-b-0">
  <button
    type="button"
    onclick={onSelect}
    class={cn(
      'hover:bg-category-background-l1-hover focus-visible:ring-ring/50 relative flex w-full cursor-pointer flex-col justify-between gap-1 px-9 py-2 text-left outline-none focus-visible:z-10 focus-visible:ring-[3px] focus-visible:ring-inset @md/list:flex-row @md/list:items-center @md/list:gap-4',
      isSelected &&
        'ring-category-foreground-l1/25 after:from-category-background-l0 ring-2 ring-inset after:absolute after:inset-y-0 after:right-0 after:w-96 after:bg-linear-to-l after:to-transparent'
    )}
  >
    <div class="z-1 flex min-w-0 flex-1 items-center gap-1 truncate text-base">
      <span class="text-category-foreground-l1">{categoryShort} /</span>
      <span class="text-category-foreground-l0 truncate">{name}</span>
    </div>
    <div class="z-1 flex shrink-0 items-center justify-end gap-4">
      {#if hasStatusIcon}
        <div class="text-category-foreground-l1 flex items-center gap-1.5 whitespace-nowrap">
          {#if hidden}
            <IconEyeClosed class="size-4 shrink-0" />
          {/if}
          {#if isDynamic}
            <IconChartAreaLineFilled class="size-4 shrink-0" />
          {/if}
          {#if instancerConfig}
            <IconCloudComputingFilled class="size-4 shrink-0" />
          {/if}
          {#if adminBotConfig}
            <IconRobot class="size-4 shrink-0" />
          {/if}
        </div>
      {/if}
      {#if isDynamic}
        <span class="text-category-foreground-l1 text-base whitespace-nowrap">Dynamic</span>
      {:else}
        <span class="text-base whitespace-nowrap tabular-nums">
          <span class="text-category-foreground-l0">{pointLabel}</span>
          <span class="text-category-foreground-l1">pts</span>
        </span>
      {/if}
    </div>
  </button>
</li>

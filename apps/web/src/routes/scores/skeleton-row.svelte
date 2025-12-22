<script lang="ts">
  import { IconCircleDashed } from '$lib/icons'
  import { cn } from '$lib/utils'

  interface Props {
    showDivision?: boolean
    isMinimal?: boolean
    colCount?: number
  }

  let { showDivision = true, isMinimal = false, colCount = 0 }: Props = $props()
</script>

<div class={cn('bg-background-l2 data-row flex rounded-lg', isMinimal ? 'w-full' : 'w-fit')}>
  <div
    class={cn(
      'col-team bg-background-l2 sticky left-0 z-10 flex h-16 items-center gap-2 px-4',
      isMinimal ? 'rounded-lg' : 'rounded-l-lg'
    )}
  >
    <div class="flex shrink-0 items-center">
      <div class="w-6"></div>
      <div class="flex w-16 flex-col items-center gap-1">
        <div class="bg-background-l3 h-5 w-10 rounded"></div>
        {#if showDivision}
          <div class="bg-background-l3 h-4 w-8 rounded"></div>
        {/if}
      </div>
    </div>
    <div class="bg-background-l3 size-12 shrink-0 rounded-lg"></div>
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <div class="bg-background-l3 h-5 w-32 max-w-full rounded"></div>
      {#if showDivision}
        <div class="bg-background-l3 h-4 w-20 max-w-full rounded"></div>
      {/if}
    </div>
    <div class="flex shrink-0 items-center gap-4">
      <div class="flex w-28 flex-col items-end gap-1">
        <div class="bg-background-l3 h-5 w-20 rounded"></div>
        <div class="bg-background-l3 h-4 w-14 rounded"></div>
      </div>
      <div class="flex h-10 w-24 items-center justify-center">
        <div
          class="to-foreground-l5/20 h-0.5 w-full rounded-full bg-linear-to-r from-transparent"
        ></div>
      </div>
    </div>
  </div>
  {#if !isMinimal && colCount > 0}
    <div class="bg-background-l2 flex gap-1 rounded-r-md pr-(--diagonal-overflow) pl-1">
      {#each Array(colCount) as _}
        <div class="bg-background-l2 flex h-16 w-12 items-center justify-center">
          <IconCircleDashed class="text-foreground-l5/25 size-7" />
        </div>
      {/each}
    </div>
  {/if}
</div>

<script lang="ts">
  import { Tooltip } from '$lib/components'
  import { cn } from '$lib/utils'
  import { getCategoryStyle } from '$lib/utils/categories'
  import type { CategoryGroup } from './types'

  interface Props {
    categoryGroups: CategoryGroup[]
    teamColWidth: number
  }

  let { categoryGroups, teamColWidth }: Props = $props()
</script>

<div class="sticky top-0 z-20 flex w-max bg-background-l0">
  <div
    class="sticky left-0 z-30 shrink-0 bg-background-l0 pr-2"
    style:width="{teamColWidth}px"
  ></div>

  <div class="flex items-stretch pr-4">
    {#each categoryGroups as group, i}
      {@const Icon = group.config.icon}
      <div
        class={cn(
          'relative flex w-12 flex-col items-center justify-center rounded-t-lg bg-category-background-l0 py-3',
          'before:absolute before:inset-0 before:-z-10 before:rounded-t-lg before:bg-background-l0',
          i < categoryGroups.length - 1 && 'mr-1'
        )}
        style={getCategoryStyle(group.config.color)}
      >
        <Tooltip.Root>
          <Tooltip.Trigger class="flex items-center justify-center">
            <Icon class="size-5 text-category-foreground-l1" />
          </Tooltip.Trigger>
          <Tooltip.Content side="bottom" sideOffset={4}>
            <p class="capitalize">{group.config.name}</p>
            <p class="text-foreground-l3">
              {group.challenges.length} challenge{group.challenges.length !== 1
                ? 's'
                : ''}
            </p>
          </Tooltip.Content>
        </Tooltip.Root>
      </div>
    {/each}
  </div>
</div>

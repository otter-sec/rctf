<script lang="ts">
  import { Permissions } from '@rctf/types'
  import { SearchInput, Tooltip } from '$lib/components'
  import { IconFold, IconLibraryPlusFilled } from '$lib/icons'
  import { useCurrentUser } from '$lib/query'
  import { cn } from '$lib/utils'
  import { hasPermissions } from '$lib/utils/permissions'

  interface Props {
    challengeCount: number
    categoryCount: number
    searchQuery: string
    isCreatingNew: boolean
    onSearchChange: (query: string) => void
    onCollapseAll: () => void
    onCreateNew: () => void
  }

  let {
    challengeCount,
    categoryCount,
    searchQuery,
    isCreatingNew,
    onSearchChange,
    onCollapseAll,
    onCreateNew,
  }: Props = $props()

  const userQuery = useCurrentUser()
  const user = $derived($userQuery.data)

  const hasWritePerms = $derived(hasPermissions(user, Permissions.challsWrite))
</script>

<div class="flex shrink-0 flex-col gap-2 py-2">
  <div class="flex items-baseline justify-between px-9">
    <div class="flex items-baseline gap-1 whitespace-nowrap">
      <span class="text-foreground-l3 text-base tabular-nums">
        {challengeCount}
      </span>
      <span class="text-foreground-l5 text-base">
        challenge{challengeCount === 1 ? '' : 's'}
      </span>
    </div>
    <div class="flex items-baseline gap-1 whitespace-nowrap">
      <span class="text-foreground-l3 text-base tabular-nums">
        {categoryCount}
      </span>
      <span class="text-foreground-l5 text-base">
        categor{categoryCount === 1 ? 'y' : 'ies'}
      </span>
    </div>
  </div>

  <div class="px-5">
    <div class="flex gap-1 overflow-hidden rounded-full">
      <SearchInput value={searchQuery} onInput={onSearchChange} class="py-2" />
      <Tooltip.Root disableCloseOnTriggerClick>
        <Tooltip.Trigger
          onclick={onCollapseAll}
          aria-label="Collapse all"
          class="rounded-sm bg-background-l2 px-4 py-2 text-foreground-l2 hover:bg-background-l3 hover:text-foreground-l1"
        >
          <IconFold class="size-5" />
        </Tooltip.Trigger>
        <Tooltip.Content sideOffset={8}>Collapse all</Tooltip.Content>
      </Tooltip.Root>
      {#if hasWritePerms}
        <Tooltip.Root disableCloseOnTriggerClick>
          <Tooltip.Trigger
            onclick={onCreateNew}
            aria-label="New challenge"
            class={cn(
              'rounded-l-sm px-4 py-2',
              isCreatingNew
                ? 'bg-background-accent hover:bg-background-accent-hover text-foreground-accent'
                : 'bg-background-l2 hover:bg-background-l3 text-foreground-l2 hover:text-foreground-l1'
            )}
          >
            <IconLibraryPlusFilled class="size-5" />
          </Tooltip.Trigger>
          <Tooltip.Content sideOffset={8}>New challenge</Tooltip.Content>
        </Tooltip.Root>
      {/if}
    </div>
  </div>
</div>

<script lang="ts">
  import { DropdownMenu, Tooltip } from '$lib/components'
  import { IconFilter, IconShieldFilled, IconUsersGroup } from '$lib/icons'
  import { cn } from '$lib/utils'
  import TeamsFilterOptions from './teams-filter-options.svelte'
  import { hasTeamFilters, type DivisionFilterOption, type TeamFilters } from './teams-model'

  interface Props {
    filters: TeamFilters
    divisionOptions: DivisionFilterOption[]
  }

  let { filters = $bindable<TeamFilters>(), divisionOptions }: Props = $props()
  const hasFilters = $derived(hasTeamFilters(filters))
</script>

<Tooltip.Root>
  <DropdownMenu.Root>
    <Tooltip.Trigger>
      {#snippet child({ props })}
        <DropdownMenu.Trigger
          {...props}
          aria-label="Add filter"
          class={cn(
            'bg-background-l4 text-foreground-l2 hover:bg-background-l5 hover:text-foreground-l1 flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors',
            hasFilters && 'text-foreground-accent'
          )}
        >
          <IconFilter class="size-4" />
        </DropdownMenu.Trigger>
      {/snippet}
    </Tooltip.Trigger>
    <DropdownMenu.Content
      align="start"
      class="bg-background-l4 border-foreground-l4/40 z-[100] w-56 overflow-hidden border-2 !p-1 shadow-xl"
    >
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger
          class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2 data-[state=open]:!bg-background-l5 data-[state=open]:!text-foreground-l2"
        >
          <IconShieldFilled class="size-4" />
          Status
        </DropdownMenu.SubTrigger>
        <DropdownMenu.SubContent
          align="start"
          alignOffset={-6}
          sideOffset={10}
          class="bg-background-l4 border-foreground-l4/40 z-[110] w-48 border-2 shadow-xl"
        >
          <TeamsFilterOptions kind="status" bind:filters {divisionOptions} />
        </DropdownMenu.SubContent>
      </DropdownMenu.Sub>
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger
          class="text-foreground-l2 data-highlighted:!bg-background-l5 data-highlighted:!text-foreground-l2 data-[state=open]:!bg-background-l5 data-[state=open]:!text-foreground-l2"
        >
          <IconUsersGroup class="size-4" />
          Division
        </DropdownMenu.SubTrigger>
        <DropdownMenu.SubContent
          align="start"
          alignOffset={-6}
          sideOffset={10}
          class="bg-background-l4 border-foreground-l4/40 z-[110] w-56 border-2 shadow-xl"
        >
          <TeamsFilterOptions kind="division" bind:filters {divisionOptions} />
        </DropdownMenu.SubContent>
      </DropdownMenu.Sub>
    </DropdownMenu.Content>
  </DropdownMenu.Root>
  <Tooltip.Content side="top" sideOffset={8}>Add filter</Tooltip.Content>
</Tooltip.Root>

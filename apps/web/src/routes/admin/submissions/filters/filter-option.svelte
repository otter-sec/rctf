<script lang="ts">
  import { Avatar, DropdownMenu } from '$lib/components'
  import { IconCheck, IconChevronRight } from '$lib/icons'
  import { cn, getInitials } from '$lib/utils'
  import type { ValueFilterFamily, ValueFilterOption } from './ui'

  interface Props {
    family: ValueFilterFamily
    option: ValueFilterOption
    showPath?: boolean
    mobile?: boolean
  }

  let { family, option, showPath = false, mobile = false }: Props = $props()
  const view = $derived(family.optionView(option))
  const selected = $derived(family.optionSelected(option))
</script>

{#snippet path()}
  <span class="text-foreground-l3 flex shrink-0 items-center gap-1">
    <family.icon class="size-3.5" />
    <span>{family.label}</span>
  </span>
  <IconChevronRight class="text-foreground-l4 size-3 shrink-0" />
{/snippet}

{#snippet content()}
  {#if showPath}
    {@render path()}
  {/if}
  {#if view.avatar}
    <Avatar.Root class="size-5 rounded-md">
      {#if view.avatar.avatarUrl}
        <Avatar.Image
          src={view.avatar.avatarUrl}
          alt={view.avatar.name}
          class="rounded-md object-cover"
        />
      {/if}
      <Avatar.Fallback class="rounded-md text-[9px]">
        {getInitials(view.avatar.name)}
      </Avatar.Fallback>
    </Avatar.Root>
  {/if}
  {#if view.icon}
    <view.icon
      class={cn('size-4 shrink-0', view.iconTone === 'category' && 'text-category-foreground-l1')}
    />
  {/if}
  {#if view.resultTone}
    <span
      class="size-1.5 shrink-0 rounded-full"
      class:bg-foreground-success={view.resultTone === 'success'}
      class:bg-foreground-yellow-l1={view.resultTone === 'warning'}
      class:bg-foreground-destructive={view.resultTone === 'danger'}
    ></span>
  {/if}
  <span class={cn('min-w-0 truncate text-sm', mobile && 'flex-1')}>
    {#each view.segments as segment}
      <span
        class:text-category-foreground-l1={segment.tone === 'categoryMuted'}
        class:text-category-foreground-l0={segment.tone === 'category'}
        class:text-foreground-success={segment.tone === 'result' && view.resultTone === 'success'}
        class:text-foreground-yellow-l1={segment.tone === 'result' && view.resultTone === 'warning'}
        class:text-foreground-destructive={segment.tone === 'result' &&
          view.resultTone === 'danger'}
      >
        {segment.text}
      </span>
    {/each}
  </span>
{/snippet}

{#if mobile}
  <button
    type="button"
    aria-pressed={selected}
    class="text-foreground-l2 hover:bg-background-l3 flex h-11 w-full min-w-0 items-center gap-3 rounded-md px-2 text-left transition-colors"
    style={view.style}
    onclick={() => family.toggleOption(option)}
  >
    <span
      class={cn(
        'border-foreground-l4/70 flex size-5 shrink-0 items-center justify-center rounded border-2',
        selected && 'bg-foreground-l1 text-background-l0 border-foreground-l1'
      )}
    >
      {#if selected}
        <IconCheck class="size-3.5" />
      {/if}
    </span>
    {@render content()}
  </button>
{:else}
  <DropdownMenu.CheckboxItem
    checked={selected}
    closeOnSelect={false}
    textValue={showPath ? `${family.label} ${view.textValue}` : view.textValue}
    class="text-foreground-l2 hover:bg-background-l5! hover:text-foreground-l2! flex w-full min-w-0 cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none select-none"
    style={view.style}
    onCheckedChange={checked => {
      if (checked !== selected) family.toggleOption(option)
    }}
  >
    {@render content()}
  </DropdownMenu.CheckboxItem>
{/if}

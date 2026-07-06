<script lang="ts">
  import IconChevronDown from '$lib/icons/icon-chevron-down.svelte'
  import IconX from '$lib/icons/icon-x.svelte'
  import Avatar from '$lib/ui/avatar.svelte'
  import Tooltip from '$lib/ui/tooltip.svelte'
  import type { Snippet } from 'svelte'
  import { setFilterMode, type MultiFilter } from './core'
  import FilterModeMenu from './filter-mode-menu.svelte'
  import FilterOptionList from './filter-option-list.svelte'
  import FilterPopover from './filter-popover.svelte'
  import type { ValueFilterFamily, ValueFilterOption } from './ui'

  // Renders one chip per active value family, iterating generically over the
  // descriptors (no per-family snippets). Time is a separate concern (U5); its
  // chip slots in through `timeChip`.
  type Props = {
    families: ValueFilterFamily[]
    filterFor: (family: ValueFilterFamily) => MultiFilter<unknown>
    timeChip?: Snippet
  }

  let { families, filterFor, timeChip }: Props = $props()

  const menuWidths: Record<ValueFilterFamily['menuSize'], string> = {
    search: '18rem',
    medium: '14rem',
    narrow: '12rem',
  }
</script>

{#snippet chipValue(family: ValueFilterFamily, option: ValueFilterOption)}
  {@const view = family.optionView(option)}
  {@const OptionIcon = view.icon}
  <chip-rich data-category-color={view.categoryColor} data-result-tone={view.resultTone}>
    {#if view.avatar}
      <avatar-slot><Avatar src={view.avatar.avatarUrl} name={view.avatar.name} /></avatar-slot>
    {/if}
    {#if OptionIcon}
      <OptionIcon aria-hidden="true" data-tone={view.iconTone} />
    {/if}
    {#if view.resultTone}
      <result-dot aria-hidden="true"></result-dot>
    {/if}
    <chip-text>
      {#each view.segments as segment, index (index)}
        <span data-tone={segment.tone}>{segment.text}</span>
      {/each}
    </chip-text>
  </chip-rich>
{/snippet}

{#snippet chip(family: ValueFilterFamily)}
  {@const filter = filterFor(family)}
  {@const Icon = family.icon}
  {@const single = filter.selected.length === 1 ? filter.selected[0] : undefined}
  <filter-chip data-width={family.chipWidth}>
    <chip-label>
      <Icon aria-hidden="true" />
      {family.label}
    </chip-label>

    <FilterModeMenu
      mode={filter.mode}
      count={filter.selected.length}
      onSelect={mode => setFilterMode(filter, mode)}
    />

    <FilterPopover label={`${family.label} values`} width={menuWidths[family.menuSize]}>
      {#snippet trigger({ props })}
        <button {...props} type="button" data-chip-value>
          {#if single !== undefined}
            {@render chipValue(family, single)}
          {:else}
            <chip-count>{filter.selected.length} {family.pluralLabel}</chip-count>
          {/if}
          <IconChevronDown aria-hidden="true" data-chevron />
        </button>
      {/snippet}
      {#snippet panel()}
        <FilterOptionList {family} searchable={!!family.search} />
      {/snippet}
    </FilterPopover>

    <Tooltip label={`Remove ${family.label.toLowerCase()} filters`}>
      {#snippet children({ props })}
        <button
          {...props}
          type="button"
          data-chip-clear
          aria-label={`Remove ${family.label.toLowerCase()} filters`}
          onclick={() => family.clear()}
        >
          <IconX aria-hidden="true" />
        </button>
      {/snippet}
    </Tooltip>
  </filter-chip>
{/snippet}

<filter-chips>
  {#each families as family (family.id)}
    {#if filterFor(family).selected.length > 0}
      {@render chip(family)}
    {/if}
  {/each}
  {@render timeChip?.()}
</filter-chips>

<style>
  filter-chips {
    display: flex;
    min-inline-size: 0;
    flex: 1;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.375rem;
  }

  filter-chip {
    display: inline-flex;
    flex-shrink: 0;
    block-size: 2rem;
    align-items: stretch;
    overflow: hidden;
    background: var(--background-l2);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);
    font-size: var(--step--1);

    &[data-width='challenge'] {
      max-inline-size: 24rem;
    }
    &[data-width='team'] {
      max-inline-size: 20rem;
    }
  }

  chip-label {
    display: flex;
    align-items: center;
    gap: var(--space-3xs);
    padding-inline: 0.5rem;
    color: var(--foreground-l3);
    border-inline-end: 2px solid var(--border);
    white-space: nowrap;

    :global(svg) {
      inline-size: 0.875rem;
      block-size: 0.875rem;
    }
  }

  button[data-chip-value] {
    display: flex;
    min-inline-size: 0;
    align-items: center;
    gap: var(--space-3xs);
    padding-inline: 0.5rem;
    color: var(--foreground-l1);
    background: transparent;
    border: none;
    cursor: pointer;

    &:hover,
    &[data-state='open'] {
      background: var(--background-l3);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -2px;
    }

    :global(svg[data-chevron]) {
      flex-shrink: 0;
      inline-size: 0.75rem;
      block-size: 0.75rem;
      color: var(--foreground-l4);
    }
  }

  chip-rich {
    display: flex;
    min-inline-size: 0;
    align-items: center;
    gap: var(--space-3xs);

    &[data-result-tone='success'] {
      --result-color: var(--foreground-success);
    }
    &[data-result-tone='warning'] {
      --result-color: var(--foreground-yellow-l1);
    }
    &[data-result-tone='danger'] {
      --result-color: var(--foreground-destructive);
    }

    :global(svg) {
      flex-shrink: 0;
      inline-size: 0.875rem;
      block-size: 0.875rem;
    }

    :global(svg[data-tone='category']) {
      color: var(--category-foreground-l1);
    }
  }

  avatar-slot {
    --avatar-size: 1rem;
    --avatar-radius: var(--radius-xs, 0.25rem);
    display: flex;
    flex-shrink: 0;
  }

  result-dot {
    flex-shrink: 0;
    inline-size: 0.375rem;
    block-size: 0.375rem;
    background: var(--result-color, var(--foreground-l3));
    border-radius: 50%;
  }

  chip-text {
    min-inline-size: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;

    span[data-tone='category'] {
      color: var(--category-foreground-l0);
    }
    span[data-tone='categoryMuted'] {
      color: var(--category-foreground-l1);
    }
    span[data-tone='result'] {
      color: var(--result-color, inherit);
    }
  }

  chip-count {
    min-inline-size: 0;
    overflow: hidden;
    color: var(--foreground-l1);
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  button[data-chip-clear] {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    inline-size: 1.75rem;
    color: var(--foreground-l3);
    background: transparent;
    border: none;
    border-inline-start: 2px solid var(--border);
    cursor: pointer;

    &:hover {
      color: var(--foreground-l1);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: -2px;
    }

    :global(svg) {
      inline-size: 0.875rem;
      block-size: 0.875rem;
    }
  }
</style>

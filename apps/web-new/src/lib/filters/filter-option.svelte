<script lang="ts">
  import IconCheck from '$lib/icons/icon-check.svelte'
  import IconChevronRight from '$lib/icons/icon-chevron-right.svelte'
  import Avatar from '$lib/ui/avatar.svelte'
  import type { ValueFilterFamily, ValueFilterOption } from './ui'

  type Props = {
    family: ValueFilterFamily
    option: ValueFilterOption
    showPath?: boolean
    mobile?: boolean
  }

  let { family, option, showPath = false, mobile = false }: Props = $props()

  const view = $derived(family.optionView(option))
  const selected = $derived(family.optionSelected(option))
  const FamilyIcon = $derived(family.icon)
  const OptionIcon = $derived(view.icon)
</script>

<button
  type="button"
  role="menuitemcheckbox"
  aria-checked={selected}
  data-mobile={mobile || undefined}
  data-category-color={view.categoryColor}
  data-result-tone={view.resultTone}
  onclick={() => family.toggleOption(option)}
>
  <check-box data-checked={selected || undefined}>
    {#if selected}<IconCheck />{/if}
  </check-box>

  {#if showPath}
    <option-path>
      <FamilyIcon aria-hidden="true" />
      <span>{family.label}</span>
      <IconChevronRight aria-hidden="true" />
    </option-path>
  {/if}

  {#if view.avatar}
    <avatar-slot>
      <Avatar src={view.avatar.avatarUrl} name={view.avatar.name} />
    </avatar-slot>
  {/if}

  {#if OptionIcon}
    <OptionIcon aria-hidden="true" data-tone={view.iconTone} />
  {/if}

  {#if view.resultTone}
    <result-dot aria-hidden="true"></result-dot>
  {/if}

  <option-label>
    {#each view.segments as segment, index (index)}
      <span data-tone={segment.tone}>{segment.text}</span>
    {/each}
  </option-label>
</button>

<style>
  button {
    display: flex;
    inline-size: 100%;
    min-inline-size: 0;
    align-items: center;
    gap: var(--space-2xs);
    padding: 0.375rem 0.5rem;
    text-align: start;
    color: var(--foreground-l2);
    background: transparent;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;

    &[data-result-tone='success'] {
      --result-color: var(--foreground-success);
    }
    &[data-result-tone='warning'] {
      --result-color: var(--foreground-yellow-l1);
    }
    &[data-result-tone='danger'] {
      --result-color: var(--foreground-destructive);
    }

    &:hover,
    &:focus-visible {
      background: var(--background-l3);
      outline: none;
    }

    &[data-mobile] {
      block-size: 2.75rem;
      gap: var(--space-xs);
      padding-inline: 0.5rem;

      check-box {
        inline-size: 1.25rem;
        block-size: 1.25rem;
      }
    }

    :global(svg) {
      flex-shrink: 0;
      inline-size: 1em;
      block-size: 1em;
    }

    :global(svg[data-tone='category']) {
      color: var(--category-foreground-l1);
    }
  }

  check-box {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    inline-size: 1rem;
    block-size: 1rem;
    color: var(--background-l1);
    border: 2px solid color-mix(in srgb, var(--foreground-l4) 70%, transparent);
    border-radius: var(--radius-xs, 0.25rem);

    &[data-checked] {
      color: var(--background-l1);
      background: var(--foreground-l1);
      border-color: var(--foreground-l1);
    }

    :global(svg) {
      inline-size: 0.75rem;
      block-size: 0.75rem;
    }
  }

  option-path {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: var(--space-3xs);
    color: var(--foreground-l3);
    font-size: var(--step--1);

    :global(svg:last-child) {
      color: var(--foreground-l4);
    }
  }

  avatar-slot {
    --avatar-size: 1.25rem;
    --avatar-radius: var(--radius-sm);
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

  option-label {
    min-inline-size: 0;
    flex: 1;
    overflow: hidden;
    font-size: var(--step--1);
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
</style>

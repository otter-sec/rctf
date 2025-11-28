<script lang="ts">
  import { Avatar } from '$lib/components'
  import type { RankVariant } from '$lib/utils'
  import { cn, getInitials, getRankStyles } from '$lib/utils'
  import type { Snippet } from 'svelte'

  interface Props {
    variant: RankVariant
    rankLabel: string | number
    name: string
    userId?: string
    subtitle?: string
    primaryValue?: string
    secondaryValue?: string
    children?: Snippet
    class?: string
  }

  let {
    variant,
    rankLabel,
    name,
    userId,
    subtitle,
    primaryValue,
    secondaryValue,
    children,
    class: className,
  }: Props = $props()

  const styles = $derived(getRankStyles(variant))
</script>

<div
  class={cn(
    'flex items-center gap-2 rounded-lg px-4 py-2',
    styles.bg,
    className
  )}
>
  <span
    class={cn(
      'w-[58px] shrink-0 text-center text-xl tabular-nums',
      styles.fgL0
    )}
  >
    {typeof rankLabel === 'number' ? `#${rankLabel}` : rankLabel}
  </span>

  <Avatar.Root class="size-12 shrink-0 rounded-lg">
    <Avatar.Fallback class="rounded-lg text-sm">
      {getInitials(name)}
    </Avatar.Fallback>
  </Avatar.Root>

  <div class="flex min-w-0 flex-1 flex-col">
    {#if userId}
      <a
        href="/profile/{userId}"
        class={cn('truncate text-xl hover:underline', styles.fgL0)}
      >
        {name}
      </a>
    {:else}
      <span class={cn('truncate text-xl', styles.fgL0)}>
        {name}
      </span>
    {/if}

    {#if subtitle}
      <span class={cn('truncate text-base', styles.fgL1)}>
        {subtitle}
      </span>
    {/if}
  </div>

  {#if primaryValue || secondaryValue || children}
    <div class="flex shrink-0 flex-col items-end">
      {#if children}
        {@render children()}
      {:else}
        {#if primaryValue}
          <span class={cn('text-xl tabular-nums', styles.fgL0)}>
            {primaryValue}
          </span>
        {/if}
        {#if secondaryValue}
          <span class={cn('text-base', styles.fgL1)}>
            {secondaryValue}
          </span>
        {/if}
      {/if}
    </div>
  {/if}
</div>

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
    avatarUrl?: string | null
    subtitle?: string
    primaryValue?: string
    secondaryValue?: string
    division?: string
    divisionPlace?: number
    children?: Snippet
    class?: string
  }

  let {
    variant,
    rankLabel,
    name,
    userId,
    avatarUrl,
    subtitle,
    primaryValue,
    secondaryValue,
    division,
    divisionPlace,
    children,
    class: className,
  }: Props = $props()

  const divisionLabel = $derived(
    division && divisionPlace ? `${division} · #${divisionPlace}` : undefined
  )

  const styles = $derived(getRankStyles(variant))
</script>

<div class={cn('flex items-center gap-2 rounded-lg px-4 py-2', styles.bg, className)}>
  <span
    class={cn('w-10 shrink-0 text-center text-base tabular-nums sm:w-12 sm:text-xl', styles.fgL0)}
  >
    {typeof rankLabel === 'number' ? `#${rankLabel}` : rankLabel}
  </span>

  <Avatar.Root class="size-10 shrink-0 rounded-lg sm:size-12">
    {#if avatarUrl}
      <Avatar.Image src={avatarUrl} alt={name} class="rounded-lg" />
    {/if}
    <Avatar.Fallback class="rounded-lg text-sm">
      {getInitials(name)}
    </Avatar.Fallback>
  </Avatar.Root>

  <div class="flex min-w-0 flex-1 flex-col">
    {#if userId}
      <a
        href="/profile/{userId}"
        class={cn('truncate text-lg hover:underline sm:text-xl', styles.fgL0)}
      >
        {name}
      </a>
    {:else}
      <span class={cn('truncate text-lg sm:text-xl', styles.fgL0)}>
        {name}
      </span>
    {/if}

    {#if subtitle || divisionLabel}
      <span class={cn('truncate text-base', styles.fgL1)}>
        {subtitle ?? divisionLabel}
      </span>
    {/if}
  </div>

  {#if primaryValue || secondaryValue || children}
    <div class="flex shrink-0 flex-col items-end">
      {#if children}
        {@render children()}
      {:else}
        {#if primaryValue}
          <span class={cn('text-base tabular-nums sm:text-xl', styles.fgL0)}>
            {primaryValue}
          </span>
        {/if}
        {#if secondaryValue}
          <span class={cn('text-sm sm:text-base', styles.fgL1)}>
            {secondaryValue}
          </span>
        {/if}
      {/if}
    </div>
  {/if}
</div>

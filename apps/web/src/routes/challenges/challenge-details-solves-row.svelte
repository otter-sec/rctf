<script lang="ts">
  import { Avatar, Tooltip } from '$lib/components'
  import type { RankVariant } from '$lib/utils'
  import { cn, getInitials, getRankStyles } from '$lib/utils'
  import { ALL_REGIONS } from '@rctf/util'
  import { countryCodeToFlagFilename } from '$lib/utils/flags'
  import type { Snippet } from 'svelte'

  interface Props {
    variant?: RankVariant
    rankLabel?: string | number
    name: string
    userId?: string
    avatarUrl?: string | null
    subtitle?: string
    countryCode?: string | null
    globalPlace?: number
    primaryValue?: string
    secondaryValue?: string
    divisionId?: string
    divisionPlace?: number
    isCurrentUser?: boolean
    children?: Snippet
    actions?: Snippet
    class?: string
  }

  let {
    variant,
    rankLabel,
    name,
    userId,
    avatarUrl,
    subtitle,
    countryCode,
    globalPlace,
    primaryValue,
    secondaryValue,
    divisionId,
    divisionPlace,
    isCurrentUser = false,
    children,
    actions,
    class: className,
  }: Props = $props()

  const showDivisionPlace = $derived(divisionId && divisionPlace)

  const flagFilename = $derived(countryCode ? countryCodeToFlagFilename(countryCode) : null)
  const countryName = $derived(
    countryCode ? (ALL_REGIONS.find(r => r.code === countryCode)?.name ?? countryCode) : null
  )
  const styles = $derived(getRankStyles(variant ?? 'nth'))
  const isMedal = $derived(variant === 'first' || variant === 'second' || variant === 'third')
  const isSelf = $derived(variant === 'self')
  const showGradient = $derived(isMedal || isSelf)
</script>

<div
  class={cn(
    'relative isolate flex h-16 items-center gap-2 rounded-lg px-4 py-2',
    'before:absolute before:inset-0 before:-z-10 before:rounded-lg',
    isCurrentUser ? 'before:bg-background-self-l1' : 'before:bg-background-l3',
    showGradient &&
      styles.gradient && [
        'after:absolute after:inset-y-0 after:left-0 after:-z-10 after:w-96 after:max-w-full after:rounded-lg after:bg-linear-to-r after:to-transparent',
        styles.gradient,
      ],
    className
  )}
>
  {#if rankLabel !== undefined}
    <span
      class={cn(
        'min-w-10 shrink-0 text-center text-base tabular-nums sm:min-w-12 sm:text-xl',
        styles.fgL0
      )}
    >
      {typeof rankLabel === 'number' ? `#${rankLabel}` : rankLabel}
    </span>
  {/if}

  <Avatar.Root class="size-10 shrink-0 rounded-lg sm:size-12">
    {#if avatarUrl}
      <Avatar.Image src={avatarUrl} alt={name} class="rounded-lg" />
    {/if}
    <Avatar.Fallback class="rounded-lg text-sm">
      {getInitials(name)}
    </Avatar.Fallback>
  </Avatar.Root>

  <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
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

    <div class="flex min-w-0 items-center gap-1">
      {#if subtitle}
        <span class={cn('truncate text-sm sm:text-base', styles.fgL1)}>{subtitle}</span>
      {:else}
        {#if flagFilename && countryCode && countryName}
          <Tooltip.Root>
            <Tooltip.Trigger>
              <img
                src="/flags/{flagFilename}"
                alt="{countryCode} flag"
                class="size-5 min-w-5 shrink-0"
              />
            </Tooltip.Trigger>
            <Tooltip.Content>{countryName}</Tooltip.Content>
          </Tooltip.Root>
        {/if}
        {#if flagFilename && countryCode && globalPlace}
          <span class={cn('shrink-0 text-xl leading-none', styles.fgL1)}>·</span>
        {/if}
        {#if globalPlace}
          <span class={cn('shrink-0 text-sm whitespace-nowrap sm:text-base', styles.fgL1)}
            >#{globalPlace} global</span
          >
        {/if}
        {#if showDivisionPlace}
          {#if flagFilename || globalPlace}
            <span class={cn('shrink-0 text-xl leading-none', styles.fgL1)}>·</span>
          {/if}
          <span class={cn('truncate text-sm whitespace-nowrap sm:text-base', styles.fgL1)}
            >#{divisionPlace} {divisionId}</span
          >
        {/if}
      {/if}
    </div>
  </div>

  {#if primaryValue || secondaryValue || children}
    <div class="flex shrink-0 flex-col items-end">
      {#if children}
        {@render children()}
      {:else}
        {#if primaryValue}
          <span class="text-foreground-l1 text-lg whitespace-nowrap tabular-nums sm:text-xl">
            {primaryValue}
          </span>
        {/if}
        {#if secondaryValue}
          <span class="text-foreground-l3 text-sm whitespace-nowrap sm:text-base">
            {secondaryValue}
          </span>
        {/if}
      {/if}
    </div>
  {/if}

  {#if actions}
    {@render actions()}
  {/if}
</div>

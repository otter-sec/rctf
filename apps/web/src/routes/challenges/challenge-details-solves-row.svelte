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
    primaryValue,
    secondaryValue,
    division,
    divisionPlace,
    children,
    class: className,
  }: Props = $props()

  // TODO(enscribe): don't randomize
  const COUNTRY_CODES = [
    'UP',
    'JP',
    'GB',
    'DE',
    'FR',
    'KR',
    'CN',
    'CA',
    'AU',
    'BR',
    'IN',
    'IL',
    'ES',
    'NL',
    'SE',
    'NO',
    'FI',
    'PL',
    'RU',
    'UA',
    'TR',
    'MX',
    'AR',
    'CH',
    'AT',
    'BE',
    'DK',
    'PT',
    'CZ',
    'RO',
    'HU',
    'GR',
    'IT',
    'SG',
    'TW',
    'VN',
    'TH',
    'MY',
    'ID',
    'PH',
  ]

  function countryCodeToFlagFilename(code: string): string {
    const codePoints = code
      .toUpperCase()
      .split('')
      .map(char => (char.charCodeAt(0) + 127397).toString(16))
    return `${codePoints.join('-')}.svg`
  }

  function getRandomCountryCode(teamId: string): string | null {
    let hash = 0
    for (let i = 0; i < teamId.length; i++) {
      hash = (hash << 5) - hash + teamId.charCodeAt(i)
      hash |= 0
    }
    if (Math.abs(hash) % 5 === 0) return null
    return COUNTRY_CODES[Math.abs(hash) % COUNTRY_CODES.length] ?? null
  }

  const countryCode = $derived(userId ? getRandomCountryCode(userId) : null)
  const flagFilename = $derived(countryCode ? countryCodeToFlagFilename(countryCode) : null)

  const styles = $derived(getRankStyles(variant))
</script>

<div class={cn('flex items-center gap-2 rounded-lg px-4 py-2', styles.bg, className)}>
  <span
    class={cn(
      'min-w-10 shrink-0 text-center text-base tabular-nums sm:min-w-12 sm:text-xl',
      styles.fgL0
    )}
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

    <div class="flex items-center gap-1">
      {#if flagFilename && countryCode}
        <img src="/flags/{flagFilename}" alt="{countryCode} flag" class="h-5 w-auto shrink-0" />
      {/if}
      {#if flagFilename && countryCode && (division || divisionPlace)}
        <span class={cn('mx-0.5 text-xl leading-none', styles.fgL1)}>·</span>
      {/if}
      {#if division}
        <span class={cn('truncate text-base', styles.fgL1)}>{division}</span>
        {#if divisionPlace}
          <span class={cn('text-base', styles.fgL1)}>#{divisionPlace}</span>
        {/if}
      {:else if divisionPlace}
        <span class={cn('text-base', styles.fgL1)}>#{divisionPlace}</span>
      {/if}
    </div>
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

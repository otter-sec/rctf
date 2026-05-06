<script lang="ts">
  import { cn, countryCodeToFlagFilename, getInitials } from '$lib/utils'
  import * as Avatar from './ui/avatar'

  interface Props {
    id: string
    name: string
    avatarUrl?: string | null
    countryCode?: string | null
    statusText?: string | null
    subtitle?: string | null
    banned?: boolean
    compact?: boolean
    showMeta?: boolean
    href?: string | null
    class?: string
  }

  let {
    id,
    name,
    avatarUrl = null,
    countryCode = null,
    statusText = null,
    subtitle = null,
    banned = false,
    compact = false,
    showMeta = true,
    href = `/profile/${id}`,
    class: className,
  }: Props = $props()

  const flagFilename = $derived(countryCode ? countryCodeToFlagFilename(countryCode) : null)
  const secondaryText = $derived(statusText || subtitle || null)
  const showSecondary = $derived(showMeta && (flagFilename || secondaryText))
</script>

<div
  class={cn(
    'flex min-w-0 items-center gap-2',
    compact && 'overflow-hidden whitespace-nowrap',
    banned && 'opacity-70',
    className
  )}
>
  <Avatar.Root class={cn('shrink-0 rounded-lg', compact ? 'size-8' : 'size-10')}>
    {#if avatarUrl}
      <Avatar.Image src={avatarUrl} alt={name} class="rounded-lg object-cover" />
    {/if}
    <Avatar.Fallback class="rounded-lg text-xs">{getInitials(name)}</Avatar.Fallback>
  </Avatar.Root>

  <div class={cn('min-w-0', compact ? 'flex items-center gap-1.5' : 'flex flex-col')}>
    {#if href}
      <a {href} class="text-foreground-l1 min-w-0 truncate text-base leading-tight hover:underline">
        {name}
      </a>
    {:else}
      <span class="text-foreground-l1 min-w-0 truncate text-base leading-tight">{name}</span>
    {/if}
    {#if showSecondary || banned}
      <div class={cn('flex min-w-0 items-center gap-1', compact && 'shrink-0')}>
        {#if showMeta && flagFilename && countryCode}
          <img
            src="/flags/{flagFilename}"
            alt="{countryCode} flag"
            title={countryCode}
            class="size-4 min-w-4 shrink-0"
          />
        {/if}
        {#if showMeta && flagFilename && countryCode && secondaryText}
          <span class="text-foreground-l4 text-base leading-none">&middot;</span>
        {/if}
        {#if showMeta && secondaryText}
          <span class={cn('text-foreground-l3 truncate text-sm', compact && 'max-w-28')}>
            {secondaryText}
          </span>
        {/if}
        {#if banned}
          <span class="text-foreground-destructive shrink-0 text-sm">banned</span>
        {/if}
      </div>
    {/if}
  </div>
</div>

<!--
  A single ranked row, shared by the solves tab (U8) and the scores tab (U11).

  Styling axes are data attributes so CSS owns the look: `data-variant`
  (gold/silver/bronze/self/nth) drives the rank colour, edge gradient and, for
  self, the tint; `data-self` adds the self base tint at any rank. The country
  tooltip mounts lazily — off-screen rows keep a plain <img> and only spin up a
  Zag tooltip machine once the flag is hovered or focused — so a feed of
  thousands of rows carries no live machines.
-->
<script module lang="ts">
  import { ALL_REGIONS } from '@rctf/util'

  const COUNTRY_NAMES = new Map(ALL_REGIONS.map(region => [region.code, region.name]))
</script>

<script lang="ts">
  import Avatar from '$lib/ui/avatar.svelte'
  import Tooltip from '$lib/ui/tooltip.svelte'
  import { countryCodeToFlagFilename } from '$lib/utils/flags'
  import type { Snippet } from 'svelte'
  import type { RankVariant } from '../model/solve-times'

  interface Props {
    variant: RankVariant
    rank: number
    name: string
    userId?: string
    avatarUrl?: string | null
    countryCode?: string | null
    globalPlace?: number | null
    division?: string | null
    divisionPlace?: number | null
    isSelf?: boolean
    primaryValue?: string
    secondaryValue?: string
    rankAccessory?: Snippet
    children?: Snippet
  }

  let {
    variant,
    rank,
    name,
    userId,
    avatarUrl,
    countryCode,
    globalPlace,
    division,
    divisionPlace,
    isSelf = false,
    primaryValue,
    secondaryValue,
    rankAccessory,
    children,
  }: Props = $props()

  const flagFilename = $derived(countryCode ? countryCodeToFlagFilename(countryCode) : null)
  const countryName = $derived(countryCode ? (COUNTRY_NAMES.get(countryCode) ?? countryCode) : null)
  const showDivision = $derived(!!division && !!divisionPlace)

  // Defer the tooltip machine until the flag is first hovered/focused.
  let tooltipReady = $state(false)
</script>

<rank-row data-variant={variant} data-self={isSelf ? '' : undefined}>
  <row-rank>
    <rank-number>#{rank}</rank-number>
    {#if rankAccessory}
      {@render rankAccessory()}
    {/if}
  </row-rank>

  <Avatar src={avatarUrl} {name} />

  <row-identity>
    {#if userId}
      <a href="/profile/{userId}" data-part="name">{name}</a>
    {:else}
      <span data-part="name">{name}</span>
    {/if}

    <row-meta>
      {#if flagFilename && countryCode}
        {#if tooltipReady && countryName}
          <Tooltip label={countryName}>
            {#snippet children({ props })}
              <img {...props} src="/flags/{flagFilename}" alt="{countryCode} flag" data-flag />
            {/snippet}
          </Tooltip>
        {:else}
          <img
            src="/flags/{flagFilename}"
            alt="{countryCode} flag"
            data-flag
            onpointerenter={() => (tooltipReady = true)}
            onfocusin={() => (tooltipReady = true)}
          />
        {/if}
      {/if}

      {#if globalPlace}
        {#if flagFilename}<meta-dot>·</meta-dot>{/if}
        <span data-part="global">#{globalPlace} global</span>
      {/if}

      {#if showDivision}
        {#if flagFilename || globalPlace}<meta-dot>·</meta-dot>{/if}
        <span data-part="division">#{divisionPlace} {division}</span>
      {/if}
    </row-meta>
  </row-identity>

  {#if children || primaryValue || secondaryValue}
    <row-trailing>
      {#if children}
        {@render children()}
      {:else}
        {#if primaryValue}<span data-part="primary">{primaryValue}</span>{/if}
        {#if secondaryValue}<span data-part="secondary">{secondaryValue}</span>{/if}
      {/if}
    </row-trailing>
  {/if}
</rank-row>

<style>
  rank-row {
    --avatar-size: 2.5rem;
    --row-fg-l0: var(--foreground-nth-l0);
    --row-fg-l1: var(--foreground-nth-l1);
    --row-base: var(--background-l3);
    --row-gradient: transparent;

    position: relative;
    isolation: isolate;
    display: flex;
    gap: 0.5rem;
    align-items: center;
    block-size: 4rem;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-lg);

    @media (width >= 40rem) {
      --avatar-size: 3rem;
    }

    /* Base fill sits behind content; the medal/self gradient washes over it. */
    &::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: -2;
      border-radius: inherit;
      background: var(--row-base);
    }

    &::after {
      content: '';
      position: absolute;
      inset-block: 0;
      inset-inline-start: 0;
      z-index: -1;
      inline-size: 24rem;
      max-inline-size: 100%;
      border-radius: inherit;
      background: linear-gradient(
        to right,
        color-mix(in oklab, var(--row-gradient) 15%, transparent),
        transparent
      );
    }

    &[data-self] {
      --row-base: var(--background-self-l1);
    }

    &[data-variant='gold'] {
      --row-fg-l0: var(--foreground-gold-l0);
      --row-fg-l1: var(--foreground-gold-l1);
      --row-gradient: var(--foreground-gold-l0);
    }

    &[data-variant='silver'] {
      --row-fg-l0: var(--foreground-silver-l0);
      --row-fg-l1: var(--foreground-silver-l1);
      --row-gradient: var(--foreground-silver-l0);
    }

    &[data-variant='bronze'] {
      --row-fg-l0: var(--foreground-bronze-l0);
      --row-fg-l1: var(--foreground-bronze-l1);
      --row-gradient: var(--foreground-bronze-l0);
    }

    &[data-variant='self'] {
      --row-fg-l0: var(--foreground-self-l0);
      --row-fg-l1: var(--foreground-self-l1);
      --row-gradient: var(--foreground-self-l0);
    }
  }

  row-rank {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    gap: 0.125rem;
    align-items: center;
    min-inline-size: 2.5rem;

    @media (width >= 40rem) {
      min-inline-size: 3rem;
    }
  }

  rank-number {
    font-size: 1rem;
    font-variant-numeric: tabular-nums;
    color: var(--row-fg-l0);

    @media (width >= 40rem) {
      font-size: 1.25rem;
    }
  }

  row-identity {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-inline-size: 0;
    overflow: hidden;
  }

  [data-part='name'] {
    overflow: hidden;
    font-size: 1.125rem;
    color: var(--row-fg-l0);
    text-overflow: ellipsis;
    white-space: nowrap;

    @media (width >= 40rem) {
      font-size: 1.25rem;
    }
  }

  a[data-part='name'] {
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  row-meta {
    display: flex;
    gap: 0.25rem;
    align-items: center;
    min-inline-size: 0;
    font-size: 0.875rem;
    color: var(--row-fg-l1);

    @media (width >= 40rem) {
      font-size: 1rem;
    }
  }

  [data-flag] {
    flex-shrink: 0;
    inline-size: 1.25rem;
    block-size: 1.25rem;
  }

  meta-dot {
    flex-shrink: 0;
    font-size: 1.25rem;
    line-height: 1;
  }

  [data-part='global'] {
    flex-shrink: 0;
    white-space: nowrap;
  }

  [data-part='division'] {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  row-trailing {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    align-items: flex-end;
    text-align: end;
  }

  [data-part='primary'] {
    font-size: 1.125rem;
    font-variant-numeric: tabular-nums;
    color: var(--foreground-l1);
    white-space: nowrap;

    @media (width >= 40rem) {
      font-size: 1.25rem;
    }
  }

  [data-part='secondary'] {
    font-size: 0.875rem;
    color: var(--foreground-l3);
    white-space: nowrap;

    @media (width >= 40rem) {
      font-size: 1rem;
    }
  }
</style>

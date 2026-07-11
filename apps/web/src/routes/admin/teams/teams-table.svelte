<script lang="ts">
  import { AdminTeamSortBy } from '@rctf/types'
  import type { MultiFilter } from '$lib/filters/core'
  import FilterBar from '$lib/filters/filter-bar.svelte'
  import type { ValueFilterFamily } from '$lib/filters/ui'
  import { IconCaretDown, IconSearch } from '$lib/icons'
  import Avatar from '$lib/ui/avatar.svelte'
  import { formatCtfOffset, formatLocalTime } from '$lib/utils/time'
  import { nextSort, type SortState } from '../admin-table-logic'
  import AdminTable from '../admin-table.svelte'
  import {
    ROW_HEIGHT,
    rowDisplayTime,
    SORT_DEFAULTS,
    statusLabel,
    statusTone,
    teamRowStatus,
    type TeamRow,
  } from './teams-model'
  import TeamsRowActions from './teams-row-actions.svelte'

  type TeamRef = { id: string; name: string }
  type BanRef = TeamRef & { banned: boolean }

  type Props = {
    rows: TeamRow[]
    sort: SortState<AdminTeamSortBy>
    search: string
    families: ValueFilterFamily[]
    filterFor: (family: ValueFilterFamily) => MultiFilter<unknown>
    hasActiveFilters: boolean
    onClearAll: () => void
    fetching: boolean
    fingerprint: string
    divisions: Record<string, string>
    startTime: number | null | undefined
    hasNextPage: boolean
    isFetchingNextPage: boolean
    onLoadMore: () => void
    canManage: boolean
    copyingId: string | null
    updatingId: string | null
    deletingId: string | null
    completingId: string | null
    resendingId: string | null
    onCopyEmail: (email: string) => void
    onManage: (id: string) => void
    onCopyToken: (team: TeamRef) => void
    onBan: (team: BanRef) => void
    onDelete: (team: TeamRef) => void
    onResend: (verification: TeamRef) => void
    onVerify: (verification: TeamRef) => void
  }

  let {
    rows,
    sort = $bindable(),
    search = $bindable(),
    families,
    filterFor,
    hasActiveFilters,
    onClearAll,
    fetching,
    fingerprint,
    divisions,
    startTime,
    hasNextPage,
    isFetchingNextPage,
    onLoadMore,
    canManage,
    copyingId,
    updatingId,
    deletingId,
    completingId,
    resendingId,
    onCopyEmail,
    onManage,
    onCopyToken,
    onBan,
    onDelete,
    onResend,
    onVerify,
  }: Props = $props()

  const columns: { col: AdminTeamSortBy; label: string }[] = [
    { col: AdminTeamSortBy.TEAM, label: 'Team' },
    { col: AdminTeamSortBy.STATUS, label: 'Status' },
    { col: AdminTeamSortBy.DIVISION, label: 'Division' },
    { col: AdminTeamSortBy.EMAIL, label: 'Email' },
    { col: AdminTeamSortBy.SCORE, label: 'Score' },
    { col: AdminTeamSortBy.SOLVES, label: 'Solves' },
    { col: AdminTeamSortBy.CREATED_AT, label: 'Registered' },
  ]

  function toggleSort(col: AdminTeamSortBy) {
    sort = nextSort(sort, col, SORT_DEFAULTS)
  }

  let tip = $state<{
    label: string
    x: number
    y: number
    place: 'top' | 'bottom'
  } | null>(null)

  function handleTipMove(event: PointerEvent) {
    const target = event.target instanceof Element ? event.target : null
    const el = target?.closest<HTMLElement>('[data-tip]')
    const label = el?.dataset.tip
    if (!el || !label) {
      tip = null
      return
    }
    const rect = el.getBoundingClientRect()
    const place = rect.top < 72 ? 'bottom' : 'top'
    tip = {
      label,
      x: rect.left + rect.width / 2,
      y: place === 'top' ? rect.top : rect.bottom,
      place,
    }
  }

  function clearTip() {
    tip = null
  }

  function divisionLabel(division: string) {
    return divisions[division] ?? division
  }

  function utcLabel(row: TeamRow, timestamp: number) {
    const prefix = row.kind === 'registered' ? 'Registered' : 'Expires'
    return `${prefix} · ${new Date(timestamp).toISOString()}`
  }
</script>

{#snippet toolbar()}
  <teams-toolbar>
    <search-field>
      <IconSearch aria-hidden="true" />
      <input
        type="search"
        placeholder="Search teams or email..."
        aria-label="Search teams or email"
        bind:value={search}
      />
    </search-field>
    <FilterBar {families} {filterFor} {hasActiveFilters} {onClearAll} {fetching} />
  </teams-toolbar>
{/snippet}

{#snippet sortHeader(col: AdminTeamSortBy, label: string)}
  {@const active = sort.by === col}
  <th-cell data-active={active || undefined} data-order={active ? sort.order : undefined}>
    <button type="button" onclick={() => toggleSort(col)}>
      <span>{label}</span>
      <IconCaretDown aria-hidden="true" data-arrow />
    </button>
  </th-cell>
{/snippet}

{#snippet header()}
  <teams-head>
    {#each columns as column (column.col)}
      {@render sortHeader(column.col, column.label)}
    {/each}
    <th-cell data-static>Actions</th-cell>
  </teams-head>
{/snippet}

{#snippet teamCell(row: TeamRow)}
  {@const name = row.kind === 'registered' ? row.team.name : row.verification.name}
  <team-cell>
    <avatar-slot>
      <Avatar src={row.kind === 'registered' ? row.team.avatarUrl : null} {name} />
    </avatar-slot>
    {#if row.kind === 'registered'}
      <a href="/profile/{row.team.id}">{name}</a>
    {:else}
      <span>{name}</span>
    {/if}
  </team-cell>
{/snippet}

{#snippet emailCell(row: TeamRow)}
  {@const email = row.kind === 'registered' ? row.team.email : row.verification.email}
  {#if email}
    <email-button data-tip="Copy email">
      <button type="button" onclick={() => onCopyEmail(email)}>{email}</button>
    </email-button>
  {:else}
    <muted>No email</muted>
  {/if}
{/snippet}

{#snippet timeCell(row: TeamRow)}
  {@const timestamp = rowDisplayTime(row)}
  {@const offset = formatCtfOffset(timestamp, startTime)}
  <time-cell data-tip={utcLabel(row, timestamp)}>
    <local>{row.kind === 'pending' ? 'Expires ' : ''}{formatLocalTime(timestamp)}</local>
    {#if offset}<offset-label>{offset}</offset-label>{/if}
  </time-cell>
{/snippet}

{#snippet row(item: TeamRow, index: number)}
  {@const status = teamRowStatus(item)}
  {@const banned = item.kind === 'registered' && item.team.banned}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <teams-row
    data-even={index % 2 === 0 || undefined}
    data-banned={banned || undefined}
    onpointermove={handleTipMove}
    onpointerleave={clearTip}
  >
    <cell>{@render teamCell(item)}</cell>
    <cell>
      <status-cell data-tone={statusTone(status)}>
        <status-dot aria-hidden="true"></status-dot>
        <span>{statusLabel(status)}</span>
      </status-cell>
    </cell>
    <cell
      ><truncate
        >{divisionLabel(
          item.kind === 'registered' ? item.team.division : item.verification.division
        )}</truncate
      ></cell
    >
    <cell>{@render emailCell(item)}</cell>
    <cell><nums>{item.kind === 'registered' ? item.team.score.toLocaleString() : '-'}</nums></cell>
    <cell
      ><nums>{item.kind === 'registered' ? item.team.solveCount.toLocaleString() : '-'}</nums></cell
    >
    <cell>{@render timeCell(item)}</cell>
    <cell>
      <TeamsRowActions
        row={item}
        {canManage}
        {copyingId}
        {updatingId}
        {deletingId}
        {completingId}
        {resendingId}
        {onManage}
        {onCopyToken}
        {onBan}
        {onDelete}
        {onResend}
        {onVerify}
      />
    </cell>
  </teams-row>
{/snippet}

{#snippet emptyState(filtered: boolean)}
  <empty-state>
    {#if filtered}
      <strong>No teams match these filters</strong>
      <p>Adjust the search or filters to widen the results.</p>
    {:else}
      <strong>No teams yet</strong>
      <p>Registered teams and pending verifications will appear here.</p>
    {/if}
  </empty-state>
{/snippet}

<table-region>
  <AdminTable
    {rows}
    rowHeight={ROW_HEIGHT}
    headerHeight={42}
    overscan={12}
    minTableWidth={1264}
    {fingerprint}
    {hasNextPage}
    {isFetchingNextPage}
    {onLoadMore}
    filtered={hasActiveFilters || search.trim().length > 0}
    {toolbar}
    {header}
    {row}
    {emptyState}
  />

  {#if tip}
    <teams-tooltip
      aria-hidden="true"
      data-place={tip.place}
      style:left={`${tip.x}px`}
      style:top={`${tip.y}px`}
    >
      {tip.label}
    </teams-tooltip>
  {/if}
</table-region>

<style>
  table-region {
    display: block;
    block-size: 100%;
    inline-size: 100%;
  }

  teams-toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    padding: var(--space-2xs);
    border-block-end: 2px solid var(--border);
  }

  search-field {
    display: flex;
    align-items: center;
    gap: var(--space-3xs);
    flex-shrink: 0;
    inline-size: min(18rem, 42vw);
    block-size: 2rem;
    padding-inline: 0.5rem;
    color: var(--foreground-l3);
    background: var(--background-l4);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);

    :global(svg) {
      flex-shrink: 0;
      inline-size: 0.875rem;
      block-size: 0.875rem;
    }

    &:focus-within {
      border-color: var(--ring);
    }

    input {
      min-inline-size: 0;
      flex: 1;
      color: var(--foreground-l1);
      background: transparent;
      border: none;
      outline: none;
      font-size: var(--step--1);

      &::placeholder {
        color: var(--foreground-l4);
      }
    }
  }

  teams-head,
  teams-row {
    display: grid;
    grid-template-columns: minmax(15rem, 1.4fr) 8rem 9rem minmax(12rem, 1fr) 6rem 6rem 12rem 11rem;
    inline-size: 100%;
    user-select: none;
  }

  teams-head {
    block-size: 100%;
    border-block-end: 2px solid var(--border);
    background: var(--background-l2);
  }

  th-cell {
    display: flex;
    min-inline-size: 0;
    align-items: center;
    padding-inline: var(--space-2xs);
    block-size: 2.5rem;
    color: var(--foreground-l3);
    font-size: var(--step--1);

    &[data-static] {
      padding-inline: 0.75rem;
    }

    button {
      display: flex;
      align-items: center;
      gap: var(--space-3xs);
      min-inline-size: 0;
      padding: 0;
      color: inherit;
      background: transparent;
      border: none;
      cursor: pointer;

      span {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      :global(svg[data-arrow]) {
        flex-shrink: 0;
        inline-size: 0.75rem;
        block-size: 0.75rem;
        opacity: 0;
      }

      &:hover {
        color: var(--foreground-l1);
      }

      &:focus-visible {
        outline: 2px solid var(--ring);
      }
    }

    &[data-active] {
      color: var(--foreground-l1);

      :global(svg[data-arrow]) {
        opacity: 1;
      }
    }

    &[data-order='asc'] :global(svg[data-arrow]) {
      rotate: 180deg;
    }
  }

  teams-row {
    align-items: stretch;
    min-block-size: 3rem;
    background: var(--background-l1);

    &[data-even] {
      background: color-mix(in srgb, var(--background-l2) 55%, var(--background-l1));
    }

    &:hover {
      background: var(--background-l3);
    }

    &[data-banned] {
      opacity: 0.7;
    }

    &:has(a:focus-visible) {
      outline: 2px solid var(--ring);
      outline-offset: -2px;
    }
  }

  cell {
    display: flex;
    min-inline-size: 0;
    align-items: center;
    padding-inline: var(--space-2xs);
    overflow: hidden;
  }

  team-cell {
    display: flex;
    min-inline-size: 0;
    align-items: center;
    gap: var(--space-2xs);

    avatar-slot {
      --avatar-size: 2rem;
      --avatar-radius: var(--radius-md);
      display: flex;
      flex-shrink: 0;
    }

    a,
    span {
      min-inline-size: 0;
      overflow: hidden;
      color: var(--foreground-l1);
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    a:hover {
      text-decoration: underline;
    }

    a:focus-visible {
      outline: none;
    }
  }

  status-cell {
    display: flex;
    min-inline-size: 0;
    align-items: center;
    gap: var(--space-3xs);

    span {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    status-dot {
      flex-shrink: 0;
      inline-size: 0.5rem;
      block-size: 0.5rem;
      border-radius: 50%;
      background: var(--tone-color);
    }

    &[data-tone='success'] {
      --tone-color: var(--foreground-success);
      color: var(--foreground-success);
    }
    &[data-tone='danger'] {
      --tone-color: var(--foreground-destructive);
      color: var(--foreground-destructive);
    }
    &[data-tone='accent'] {
      --tone-color: var(--foreground-accent);
      color: var(--foreground-accent);
    }
    &[data-tone='warning'] {
      --tone-color: var(--foreground-yellow-l1);
      color: var(--foreground-yellow-l1);
    }
  }

  truncate {
    overflow: hidden;
    color: var(--foreground-l1);
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  email-button {
    display: flex;
    min-inline-size: 0;

    button {
      min-inline-size: 0;
      overflow: hidden;
      color: var(--foreground-l2);
      background: transparent;
      border: none;
      white-space: nowrap;
      text-overflow: ellipsis;
      text-align: start;
      cursor: pointer;

      &:hover {
        color: var(--foreground-l1);
        text-decoration: underline;
      }
    }
  }

  muted {
    color: var(--foreground-l4);
  }

  nums {
    color: var(--foreground-l1);
    font-variant-numeric: tabular-nums;
  }

  time-cell {
    display: flex;
    min-inline-size: 0;
    align-items: baseline;
    gap: var(--space-3xs);

    local {
      flex-shrink: 0;
      color: var(--foreground-l1);
      font-variant-numeric: tabular-nums;
    }

    offset-label {
      min-inline-size: 0;
      overflow: hidden;
      color: var(--foreground-l3);
      font-size: var(--step--2);
      white-space: nowrap;
      text-overflow: ellipsis;
      font-variant-numeric: tabular-nums;
    }
  }

  empty-state {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    align-items: center;
    text-align: center;

    strong {
      color: var(--foreground-l1);
      font-weight: 500;
    }

    p {
      color: var(--foreground-l3);
      font-size: var(--step--1);
    }
  }

  teams-tooltip {
    position: fixed;
    z-index: var(--layer-popover);
    display: block;
    max-inline-size: 22rem;
    padding: var(--space-3xs) var(--space-2xs);
    color: var(--foreground-l1);
    background: var(--background-l2);
    border: 2px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: var(--step--1);
    white-space: nowrap;
    pointer-events: none;
    translate: -50% calc(-100% - 0.5rem);

    &[data-place='bottom'] {
      translate: -50% 0.5rem;
    }
  }
</style>

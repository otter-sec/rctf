<script lang="ts">
  import {
    IconAwardFilled,
    IconCheck,
    IconGavel,
    IconKey,
    IconPaperPlaneTilt,
    IconTrash,
    IconUserGear,
  } from '$lib/icons'
  import Spinner from '$lib/ui/spinner.svelte'
  import type { IconComponent } from '$lib/utils/categories'
  import { deriveTeamStatus, type TeamRow } from './teams-model'

  type TeamRef = { id: string; name: string }
  type BanRef = TeamRef & { banned: boolean }

  type Props = {
    row: TeamRow
    canManage: boolean
    copyingId: string | null
    updatingId: string | null
    deletingId: string | null
    completingId: string | null
    resendingId: string | null
    onManage: (id: string) => void
    onCopyToken: (team: TeamRef) => void
    onBan: (team: BanRef) => void
    onDelete: (team: TeamRef) => void
    onResend: (verification: TeamRef) => void
    onVerify: (verification: TeamRef) => void
  }

  let {
    row,
    canManage,
    copyingId,
    updatingId,
    deletingId,
    completingId,
    resendingId,
    onManage,
    onCopyToken,
    onBan,
    onDelete,
    onResend,
    onVerify,
  }: Props = $props()

  const isAdmin = $derived(row.kind === 'registered' && deriveTeamStatus(row.team) === 'admin')
</script>

{#snippet action(opts: {
  label: string
  icon: IconComponent
  onclick: () => void
  loading?: boolean
  disabled?: boolean
  destructive?: boolean
})}
  {@const Icon = opts.icon}
  <button
    type="button"
    data-tip={opts.label}
    data-tone={opts.destructive ? 'danger' : undefined}
    aria-label={opts.label}
    disabled={opts.disabled || opts.loading}
    onclick={opts.onclick}
  >
    {#if opts.loading}
      <Spinner />
    {:else}
      <Icon aria-hidden="true" />
    {/if}
  </button>
{/snippet}

<row-actions>
  {#if row.kind === 'registered'}
    {@const team = row.team}
    {#if isAdmin}
      <admin-badge data-tip="Admin account">
        <IconAwardFilled aria-hidden="true" />
      </admin-badge>
    {:else}
      {#if canManage}
        {@render action({
          label: 'Manage team',
          icon: IconUserGear,
          onclick: () => onManage(team.id),
        })}
      {/if}
      {@render action({
        label: 'Copy login token',
        icon: IconKey,
        loading: copyingId === team.id,
        onclick: () => onCopyToken({ id: team.id, name: team.name }),
      })}
      {@render action({
        label: team.banned ? 'Unban team' : 'Ban team',
        icon: IconGavel,
        destructive: !team.banned,
        loading: updatingId === team.id,
        onclick: () => onBan({ id: team.id, name: team.name, banned: team.banned }),
      })}
      {@render action({
        label: 'Delete team',
        icon: IconTrash,
        destructive: true,
        loading: deletingId === team.id,
        onclick: () => onDelete({ id: team.id, name: team.name }),
      })}
    {/if}
  {:else}
    {@const verification = row.verification}
    {@render action({
      label: 'Resend verification',
      icon: IconPaperPlaneTilt,
      loading: resendingId === verification.id,
      disabled: completingId === verification.id,
      onclick: () => onResend({ id: verification.id, name: verification.name }),
    })}
    {@render action({
      label: 'Verify team',
      icon: IconCheck,
      loading: completingId === verification.id,
      disabled: resendingId === verification.id,
      onclick: () => onVerify({ id: verification.id, name: verification.name }),
    })}
  {/if}
</row-actions>

<style>
  row-actions {
    display: flex;
    align-items: center;
    gap: var(--space-3xs);
  }

  button,
  admin-badge {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    inline-size: 2rem;
    block-size: 2rem;
    border-radius: var(--radius-md);

    :global(svg) {
      inline-size: 1rem;
      block-size: 1rem;
    }
  }

  button {
    color: var(--foreground-l2);
    background: var(--background-l4);
    border: 2px solid transparent;
    cursor: pointer;

    &:hover {
      color: var(--foreground-l1);
      background: var(--background-l5);
    }

    &[data-tone='danger'] {
      color: var(--foreground-destructive);

      &:hover {
        background: color-mix(in srgb, var(--foreground-destructive) 16%, var(--background-l4));
      }
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
    }

    &:disabled {
      pointer-events: none;
      opacity: 0.6;
    }
  }

  admin-badge {
    color: var(--foreground-accent);
    background: var(--background-accent);
  }
</style>

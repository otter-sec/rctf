<script lang="ts">
  import { Avatar, Button, Spinner, Tooltip } from '$lib/components'
  import {
    IconCheck,
    IconCopy,
    IconMoodX,
    IconSend,
    IconShieldFilled,
    IconTrashFilled,
    IconUserCog,
  } from '$lib/icons'
  import { cn, formatLocalTime, formatRelativeHoursMinutes, getInitials } from '$lib/utils'
  import {
    rowTime,
    statusTone,
    teamRowDivision,
    teamRowEmail,
    teamRowName,
    teamRowStatus,
    teamStatusLabel,
    type AdminTeam,
    type PendingVerification,
    type TeamDisplayStatus,
    type TeamRow,
  } from './teams-model'

  type ClientConfig = {
    divisions: Record<string, string>
    startTime?: number | null
  }

  interface Props {
    row: TeamRow
    index: number
    clientConfig?: ClientConfig
    hasWritePerms: boolean
    hasTeamDetailsPerms: boolean
    copyingTeamId: string | null
    updatingTeamId: string | null
    deletingTeamId: string | null
    completingVerificationId: string | null
    resendingVerificationId: string | null
    onCopyEmail: (email: string) => void
    onCopyToken: (team: { id: string; name: string }) => void
    onManageTeam: (teamId: string) => void
    onBanAction: (team: { id: string; name: string; banned: boolean }) => void
    onDeleteTeam: (team: { id: string; name: string }) => void
    onCompleteVerification: (verification: { id: string; name: string }) => void
    onResendVerification: (verification: { id: string; name: string }) => void
  }

  let {
    row,
    index,
    clientConfig,
    hasWritePerms,
    hasTeamDetailsPerms,
    copyingTeamId,
    updatingTeamId,
    deletingTeamId,
    completingVerificationId,
    resendingVerificationId,
    onCopyEmail,
    onCopyToken,
    onManageTeam,
    onBanAction,
    onDeleteTeam,
    onCompleteVerification,
    onResendVerification,
  }: Props = $props()

  function formatCtfOffset(timestamp: number) {
    if (clientConfig?.startTime === null || clientConfig?.startTime === undefined) return ''
    return `T${formatRelativeHoursMinutes(timestamp, clientConfig.startTime)}`
  }
</script>

{#snippet statusDot(status: TeamDisplayStatus)}
  {@const tone = statusTone(status)}
  <span
    class="size-1.5 shrink-0 rounded-full"
    class:bg-foreground-success={tone === 'success'}
    class:bg-foreground-yellow-l1={tone === 'warning'}
    class:bg-foreground-destructive={tone === 'danger'}
    class:bg-foreground-accent={tone === 'accent'}
  ></span>
{/snippet}

{#snippet statusText(status: TeamDisplayStatus)}
  {@const tone = statusTone(status)}
  <span
    class="inline-flex min-w-0 items-center gap-1.5 truncate whitespace-nowrap"
    class:text-foreground-success={tone === 'success'}
    class:text-foreground-yellow-l1={tone === 'warning'}
    class:text-foreground-destructive={tone === 'danger'}
    class:text-foreground-accent={tone === 'accent'}
  >
    {@render statusDot(status)}
    <span class="min-w-0 truncate">{teamStatusLabel(status)}</span>
  </span>
{/snippet}

{#snippet teamCell(row: TeamRow)}
  {@const name = teamRowName(row)}
  <div
    class={cn(
      'flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap',
      row.kind === 'registered' && row.team.banned && 'opacity-70'
    )}
  >
    <Avatar.Root class="size-8 shrink-0 rounded-lg">
      {#if row.kind === 'registered' && row.team.avatarUrl}
        <Avatar.Image src={row.team.avatarUrl} alt={name} class="rounded-lg object-cover" />
      {/if}
      <Avatar.Fallback class="rounded-lg text-xs">{getInitials(name)}</Avatar.Fallback>
    </Avatar.Root>
    {#if row.kind === 'registered'}
      <a
        href="/profile/{row.team.id}"
        class="text-foreground-l1 min-w-0 truncate text-base leading-tight hover:underline"
      >
        {name}
      </a>
    {:else}
      <span class="text-foreground-l1 min-w-0 truncate text-base leading-tight">{name}</span>
    {/if}
  </div>
{/snippet}

{#snippet emailCell(row: TeamRow)}
  {@const email = teamRowEmail(row)}
  {#if email}
    <Tooltip.Root>
      <Tooltip.Trigger>
        <button
          type="button"
          class="text-foreground-l2 hover:text-foreground-l1 max-w-full truncate text-left hover:underline"
          onclick={() => onCopyEmail(email)}
        >
          {email}
        </button>
      </Tooltip.Trigger>
      <Tooltip.Content>Copy email</Tooltip.Content>
    </Tooltip.Root>
  {:else}
    <span class="text-foreground-l3 truncate">No email</span>
  {/if}
{/snippet}

{#snippet timeCell(row: TeamRow)}
  {@const timestamp = rowTime(row)}
  {@const ctfOffset = formatCtfOffset(timestamp)}
  <Tooltip.Root>
    <Tooltip.Trigger class="block max-w-full min-w-0 overflow-hidden">
      <div class="flex max-w-full min-w-0 items-baseline gap-2 overflow-hidden whitespace-nowrap">
        <span class="text-foreground-l1 shrink-0 tabular-nums">
          {row.kind === 'pending' ? 'Expires ' : ''}{formatLocalTime(timestamp)}
        </span>
        {#if ctfOffset}
          <span class="text-foreground-l3 min-w-0 truncate text-xs tabular-nums">
            {ctfOffset}
          </span>
        {/if}
      </div>
    </Tooltip.Trigger>
    <Tooltip.Content>
      {row.kind === 'registered' ? 'Registered' : 'Expires'} UTC {new Date(timestamp).toISOString()}
    </Tooltip.Content>
  </Tooltip.Root>
{/snippet}

{#snippet registeredActions(team: AdminTeam)}
  {@const isAdmin = team.perms > 0}
  {@const isCopying = copyingTeamId === team.id}
  {@const isUpdating = updatingTeamId === team.id}
  {@const isDeleting = deletingTeamId === team.id}
  <div class="flex items-center gap-1">
    {#if hasWritePerms}
      {#if isAdmin}
        <Tooltip.Root>
          <Tooltip.Trigger>
            <div
              class="bg-background-accent text-foreground-accent flex size-8 items-center justify-center rounded-md"
            >
              <IconShieldFilled class="size-4" />
            </div>
          </Tooltip.Trigger>
          <Tooltip.Content>Admin account</Tooltip.Content>
        </Tooltip.Root>
      {:else}
        {#if hasTeamDetailsPerms}
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Button
                variant="secondary"
                size="icon"
                class="size-8"
                onclick={() => onManageTeam(team.id)}
                aria-label="Manage team"
              >
                <IconUserCog class="size-4" />
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>Manage team</Tooltip.Content>
          </Tooltip.Root>
        {/if}
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button
              variant="secondary"
              size="icon"
              class="size-8"
              onclick={() => onCopyToken(team)}
              disabled={isCopying}
              aria-label="Copy new token"
            >
              {#if isCopying}
                <Spinner class="size-4" />
              {:else}
                <IconCopy class="size-4" />
              {/if}
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>Copy new token</Tooltip.Content>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button
              variant={team.banned ? 'secondary' : 'destructive'}
              size="icon"
              class="size-8"
              onclick={() => onBanAction(team)}
              disabled={isUpdating}
              aria-label={team.banned ? 'Unban team' : 'Ban team'}
            >
              {#if isUpdating}
                <Spinner class="size-4" />
              {:else}
                <IconMoodX class="size-4" />
              {/if}
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>{team.banned ? 'Unban team' : 'Ban team'}</Tooltip.Content>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger>
            <Button
              variant="destructive"
              size="icon"
              class="size-8"
              onclick={() => onDeleteTeam(team)}
              disabled={isDeleting}
              aria-label="Delete team"
            >
              {#if isDeleting}
                <Spinner class="size-4" />
              {:else}
                <IconTrashFilled class="size-4" />
              {/if}
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>Delete team</Tooltip.Content>
        </Tooltip.Root>
      {/if}
    {/if}
  </div>
{/snippet}

{#snippet pendingActions(verification: PendingVerification)}
  {@const isCompleting = completingVerificationId === verification.id}
  {@const isResending = resendingVerificationId === verification.id}
  <div class="flex items-center gap-1">
    {#if hasWritePerms}
      <Tooltip.Root>
        <Tooltip.Trigger>
          <Button
            variant="secondary"
            size="icon"
            class="size-8"
            onclick={() => onResendVerification(verification)}
            disabled={isResending || isCompleting}
            aria-label="Resend verification"
          >
            {#if isResending}
              <Spinner class="size-4" />
            {:else}
              <IconSend class="size-4" />
            {/if}
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>Resend verification</Tooltip.Content>
      </Tooltip.Root>
      <Tooltip.Root>
        <Tooltip.Trigger>
          <Button
            size="icon"
            class="size-8"
            onclick={() => onCompleteVerification(verification)}
            disabled={isCompleting || isResending}
            aria-label="Verify team"
          >
            {#if isCompleting}
              <Spinner class="size-4" />
            {:else}
              <IconCheck class="size-4" />
            {/if}
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>Verify team</Tooltip.Content>
      </Tooltip.Root>
    {/if}
  </div>
{/snippet}

{#snippet rowActions(row: TeamRow)}
  {#if row.kind === 'registered'}
    {@render registeredActions(row.team)}
  {:else}
    {@render pendingActions(row.verification)}
  {/if}
{/snippet}

<div
  class={cn(
    'grid h-full grid-cols-[minmax(18rem,1.3fr)_9rem_11rem_minmax(16rem,1fr)_8rem_7rem_15rem_12rem] overflow-hidden',
    index % 2 === 0 ? 'bg-background-l1' : 'bg-background-l2/70',
    'hover:bg-background-l3/80'
  )}
>
  <div class="flex min-w-0 items-center px-3 py-2">
    {@render teamCell(row)}
  </div>
  <div class="flex min-w-0 items-center px-3 py-2">
    {@render statusText(teamRowStatus(row))}
  </div>
  <div class="text-foreground-l1 flex min-w-0 items-center truncate px-3 py-2">
    {clientConfig?.divisions[teamRowDivision(row)] ?? teamRowDivision(row)}
  </div>
  <div class="text-foreground-l2 flex min-w-0 items-center px-3 py-2">
    {@render emailCell(row)}
  </div>
  <div class="text-foreground-l1 flex items-center px-3 py-2 tabular-nums">
    {row.kind === 'registered' ? row.team.score.toLocaleString() : '-'}
  </div>
  <div class="text-foreground-l1 flex items-center px-3 py-2 tabular-nums">
    {row.kind === 'registered' ? row.team.solveCount.toLocaleString() : '-'}
  </div>
  <div class="text-foreground-l2 flex min-w-0 items-center px-3 py-2 tabular-nums">
    {@render timeCell(row)}
  </div>
  <div class="flex items-center px-3 py-2">
    {@render rowActions(row)}
  </div>
</div>

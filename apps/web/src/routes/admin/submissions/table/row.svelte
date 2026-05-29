<script lang="ts">
  import { SubmissionKind } from '@rctf/types'
  import { Avatar } from '$lib/components'
  import { IconChevronRight, IconFlag3Filled, IconRobot } from '$lib/icons'
  import {
    cn,
    formatCtfOffset,
    formatLocalTime,
    getCategoryConfig,
    getCategoryStyle,
    getInitials,
  } from '$lib/utils'
  import type { VirtualRow } from '../filters/ui'
  import { canInspectIp, ipInfoUrl, kindLabel, type Submission } from '../submissions-utils'
  import SubmissionResultText from './result-text.svelte'

  interface Props {
    row: VirtualRow
    submission: Submission
    index: number
    expandedSubmissionId: string | null
    listScrollMargin: number
    ctfStartTime?: number | null
    onToggle: (submissionId: string) => void
  }

  let {
    row,
    submission,
    index,
    expandedSubmissionId,
    listScrollMargin,
    ctfStartTime,
    onToggle,
  }: Props = $props()

  const isExpanded = $derived(expandedSubmissionId === submission.id)

  function handleRowKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onToggle(submission.id)
  }
</script>

{#snippet timeCell()}
  {@const timestamp = new Date(submission.createdAt).getTime()}
  {@const ctfOffset = formatCtfOffset(timestamp, ctfStartTime)}
  {@const label = `UTC ${new Date(submission.createdAt).toISOString()}`}
  <div
    role="note"
    data-tooltip-label={label}
    class="flex max-w-full min-w-0 items-baseline gap-2 overflow-hidden whitespace-nowrap"
  >
    <span class="text-foreground-l1 shrink-0 tabular-nums">
      {formatLocalTime(timestamp)}
    </span>
    {#if ctfOffset}
      <span class="text-foreground-l3 min-w-0 truncate text-xs tabular-nums">
        {ctfOffset}
      </span>
    {/if}
  </div>
{/snippet}

{#snippet challengeCell()}
  {@const category = getCategoryConfig(submission.challengeCategory)}
  <a
    href="/challenges?challenge={submission.challengeId}"
    class="group flex max-w-full min-w-0 items-center overflow-hidden whitespace-nowrap"
    style={getCategoryStyle(category.color)}
    onclick={event => event.stopPropagation()}
  >
    <span class="min-w-0 truncate text-base leading-tight">
      <span class="text-category-foreground-l1">{submission.challengeCategory} /</span>
      <span class="text-category-foreground-l0 group-hover:underline"
        >{submission.challengeName}</span
      >
    </span>
  </a>
{/snippet}

{#snippet teamCell()}
  <div
    class={cn(
      'flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap',
      submission.userBanned && 'opacity-70'
    )}
  >
    <Avatar.Root class="size-8 shrink-0 rounded-lg">
      {#if submission.userAvatarUrl}
        <Avatar.Image
          src={submission.userAvatarUrl}
          alt={submission.userName}
          class="rounded-lg object-cover"
        />
      {/if}
      <Avatar.Fallback class="rounded-lg text-xs">
        {getInitials(submission.userName)}
      </Avatar.Fallback>
    </Avatar.Root>
    <a
      href="/profile/{submission.userId}"
      class="text-foreground-l1 min-w-0 truncate text-base leading-tight hover:underline"
      onclick={event => event.stopPropagation()}
    >
      {submission.userName}
    </a>
    {#if submission.userBanned}
      <span class="text-foreground-destructive shrink-0 text-sm">banned</span>
    {/if}
  </div>
{/snippet}

{#snippet ipCell()}
  {#if canInspectIp(submission.ip)}
    <a
      href={ipInfoUrl(submission.ip)}
      target="_blank"
      rel="noreferrer"
      class="bg-background-l4 text-foreground-l2 hover:text-foreground-l1 max-w-full truncate rounded-md px-2 py-1 text-xs whitespace-nowrap hover:underline"
      onclick={event => event.stopPropagation()}
    >
      <code>{submission.ip}</code>
    </a>
  {:else}
    <code
      class="bg-background-l4 text-foreground-l3 max-w-full truncate rounded-md px-2 py-1 text-xs whitespace-nowrap"
    >
      {submission.ip}
    </code>
  {/if}
{/snippet}

{#snippet kindBadge()}
  <span
    class="bg-background-l4 text-foreground-l2 inline-flex max-w-full items-center gap-1 rounded-md px-2 py-1 text-xs whitespace-nowrap"
  >
    {#if submission.kind === SubmissionKind.ADMIN_BOT}
      <IconRobot class="size-3.5 shrink-0" />
      <span class="truncate">{kindLabel(submission.kind)}</span>
    {:else}
      <IconFlag3Filled class="size-3.5 shrink-0" />
      <span class="truncate">{kindLabel(submission.kind)}</span>
    {/if}
  </span>
{/snippet}

<div
  class="absolute top-0 left-0 w-full will-change-transform contain-[layout_style_paint]"
  style:height={`${row.size}px`}
  style:transform={`translate3d(0, ${row.start - listScrollMargin}px, 0)`}
>
  <div
    class={cn(
      'grid h-full cursor-pointer grid-cols-[2.75rem_16rem_14rem_minmax(11rem,1fr)_11rem_9rem_10rem] overflow-hidden',
      isExpanded
        ? 'bg-background-l3'
        : index % 2 === 0
          ? 'bg-background-l1'
          : 'bg-background-l2/70',
      'hover:bg-background-l3/80'
    )}
    role="button"
    tabindex="0"
    aria-expanded={isExpanded}
    onclick={() => onToggle(submission.id)}
    onkeydown={handleRowKeydown}
  >
    <div class="flex items-center justify-center">
      <button
        type="button"
        aria-label={isExpanded ? 'Hide submitted details' : 'Show submitted details'}
        aria-expanded={isExpanded}
        data-tooltip-label={isExpanded ? 'Hide submitted details' : 'Show submitted details'}
        class="text-foreground-l3 hover:text-foreground-l1 hover:bg-background-l4 flex size-7 items-center justify-center rounded-md transition-colors"
        onclick={event => {
          event.stopPropagation()
          onToggle(submission.id)
        }}
      >
        <IconChevronRight class={cn('size-4 transition-transform', isExpanded && 'rotate-90')} />
      </button>
    </div>
    <div class="flex min-w-0 items-center overflow-hidden px-3 py-2">
      {@render timeCell()}
    </div>
    <div class="flex min-w-0 items-center px-3 py-2">
      {@render challengeCell()}
    </div>
    <div class="flex min-w-0 items-center px-3 py-2">
      {@render teamCell()}
    </div>
    <div class="flex min-w-0 items-center px-3 py-2">
      {@render ipCell()}
    </div>
    <div class="flex min-w-0 items-center px-3 py-2">
      {@render kindBadge()}
    </div>
    <div class="flex min-w-0 items-center px-3 py-2">
      <span class="text-sm">
        <SubmissionResultText result={submission.result} />
      </span>
    </div>
  </div>
</div>

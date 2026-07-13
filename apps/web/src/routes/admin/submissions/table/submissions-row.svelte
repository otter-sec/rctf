<script lang="ts">
  import { SubmissionKind } from '@rctf/types'
  import { IconCaretRight, IconFlagBannerFold, IconRobot } from '$lib/icons'
  import Avatar from '$lib/ui/avatar.svelte'
  import { getCategoryConfig } from '$lib/utils/categories'
  import { formatCtfOffset, formatLocalTime } from '$lib/utils/time'
  import {
    ipInfoUrl,
    isRealIp,
    kindLabel,
    type Submission,
  } from '../submissions-model'
  import SubmissionsResult from './submissions-result.svelte'

  type Props = {
    submission: Submission
    index: number
    expanded: boolean
    ctfStartTime?: number | null
    onToggle: (id: string) => void
  }

  let { submission, index, expanded, ctfStartTime, onToggle }: Props = $props()

  const category = $derived(getCategoryConfig(submission.challengeCategory))
  const timestamp = $derived(new Date(submission.createdAt).getTime())
  const ctfOffset = $derived(formatCtfOffset(timestamp, ctfStartTime))
  const isoLabel = $derived(
    `UTC ${new Date(submission.createdAt).toISOString()}`
  )

  function toggle() {
    onToggle(submission.id)
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    toggle()
  }
</script>

<submission-row
  role="button"
  tabindex="0"
  aria-expanded={expanded}
  data-expanded={expanded || undefined}
  data-even={index % 2 === 0 || undefined}
  onclick={toggle}
  onkeydown={onKeydown}
>
  <row-cell data-col="expander">
    <expander-button
      role="presentation"
      data-open={expanded || undefined}
      aria-hidden="true"
    >
      <IconCaretRight />
    </expander-button>
  </row-cell>

  <row-cell data-col="time" title={isoLabel}>
    <time-value>{formatLocalTime(timestamp)}</time-value>
    {#if ctfOffset}
      <time-offset>{ctfOffset}</time-offset>
    {/if}
  </row-cell>

  <row-cell data-col="challenge">
    <a
      href="/challenges?challenge={submission.challengeId}"
      data-category-color={category.color}
      onclick={event => event.stopPropagation()}
    >
      <span data-part="category">{submission.challengeCategory} /</span>
      <span data-part="name">{submission.challengeName}</span>
    </a>
  </row-cell>

  <row-cell data-col="team" data-banned={submission.userBanned || undefined}>
    <avatar-slot>
      <Avatar src={submission.userAvatarUrl} name={submission.userName} />
    </avatar-slot>
    <a
      href="/profile/{submission.userId}"
      onclick={event => event.stopPropagation()}
    >
      {submission.userName}
    </a>
    {#if submission.userBanned}
      <banned-tag>banned</banned-tag>
    {/if}
  </row-cell>

  <row-cell data-col="ip">
    {#if isRealIp(submission.ip)}
      <a
        href={ipInfoUrl(submission.ip)}
        target="_blank"
        rel="noreferrer"
        data-ip
        onclick={event => event.stopPropagation()}
      >
        <code>{submission.ip}</code>
      </a>
    {:else}
      <code data-ip data-inert>{submission.ip}</code>
    {/if}
  </row-cell>

  <row-cell data-col="kind">
    <kind-badge>
      {#if submission.kind === SubmissionKind.ADMIN_BOT}
        <IconRobot aria-hidden="true" />
      {:else}
        <IconFlagBannerFold aria-hidden="true" />
      {/if}
      <span>{kindLabel(submission.kind)}</span>
    </kind-badge>
  </row-cell>

  <row-cell data-col="result">
    <SubmissionsResult result={submission.result} />
  </row-cell>
</submission-row>

<style>
  submission-row {
    display: grid;
    grid-template-columns:
      2.75rem 16rem 14rem minmax(11rem, 1fr)
      11rem 9rem 10rem;
    inline-size: 100%;
    block-size: 3rem;
    cursor: pointer;
    user-select: none;
    background: var(--background-l1);
    font-size: var(--step--1);

    &[data-even] {
      background: var(--background-l2);
    }

    &:hover {
      background: var(--background-l3);
    }

    &[data-expanded] {
      background: var(--background-l3);
    }

    &:focus-visible,
    &:has(a:focus-visible) {
      outline: 2px solid var(--ring);
      outline-offset: -2px;
    }

    &:hover expander-button {
      color: var(--foreground-l1);
      background: var(--background-l4);
    }
  }

  row-cell {
    display: flex;
    min-inline-size: 0;
    align-items: center;
    gap: var(--space-3xs);
    padding-inline: var(--space-2xs);
    overflow: hidden;
    white-space: nowrap;

    &[data-col='expander'] {
      justify-content: center;
      padding-inline: 0;
    }

    &[data-banned] {
      opacity: 0.7;
    }

    &[data-col='challenge'] a {
      display: inline-flex;
      min-inline-size: 0;
      gap: var(--space-3xs);
      overflow: hidden;
      text-overflow: ellipsis;

      [data-part='category'] {
        flex-shrink: 0;
        color: var(--category-foreground-l1);
      }

      [data-part='name'] {
        min-inline-size: 0;
        overflow: hidden;
        color: var(--category-foreground-l0);
        text-overflow: ellipsis;
      }

      &:hover [data-part='name'] {
        text-decoration: underline;
      }
    }

    &[data-col='team'] a {
      min-inline-size: 0;
      overflow: hidden;
      color: var(--foreground-l1);
      text-overflow: ellipsis;

      &:hover {
        text-decoration: underline;
      }
    }

    a:focus-visible {
      outline: none;
    }
  }

  expander-button {
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: 1.75rem;
    block-size: 1.75rem;
    color: var(--foreground-l3);
    border-radius: var(--radius-md);

    :global(svg) {
      inline-size: 1rem;
      block-size: 1rem;
      transition: rotate 0.15s ease;
    }

    &[data-open] :global(svg) {
      rotate: 90deg;
    }
  }

  time-value {
    flex-shrink: 0;
    color: var(--foreground-l1);
    font-variant-numeric: tabular-nums;
  }

  time-offset {
    min-inline-size: 0;
    overflow: hidden;
    color: var(--foreground-l3);
    font-size: var(--step--2);
    text-overflow: ellipsis;
    font-variant-numeric: tabular-nums;
  }

  avatar-slot {
    --avatar-size: 2rem;
    --avatar-radius: var(--radius-md);
    display: flex;
    flex-shrink: 0;
  }

  banned-tag {
    flex-shrink: 0;
    color: var(--foreground-destructive);
    font-size: var(--step--2);
  }

  [data-ip] {
    max-inline-size: 100%;
    overflow: hidden;
    padding: var(--space-3xs) var(--space-2xs);
    color: var(--foreground-l2);
    background: var(--background-l4);
    border-radius: var(--radius-md);
    font-size: var(--step--2);
    text-overflow: ellipsis;
    white-space: nowrap;

    &[data-inert] {
      color: var(--foreground-l3);
    }

    &:not([data-inert]):hover {
      color: var(--foreground-l1);
      text-decoration: underline;
    }
  }

  kind-badge {
    display: inline-flex;
    max-inline-size: 100%;
    align-items: center;
    gap: var(--space-3xs);
    padding: var(--space-3xs) var(--space-2xs);
    color: var(--foreground-l2);
    background: var(--background-l4);
    border-radius: var(--radius-md);
    font-size: var(--step--2);

    :global(svg) {
      flex-shrink: 0;
      inline-size: 0.875rem;
      block-size: 0.875rem;
    }

    span {
      min-inline-size: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
</style>

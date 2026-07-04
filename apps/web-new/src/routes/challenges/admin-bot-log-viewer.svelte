<!--
  Collapsible JSONL log viewer for a single admin-bot job. Each line shows a
  24-hour timestamp, a level letter (colored via data-level), the [prefix] and
  message; lines carrying `extra` expand to a key-value block. Owns its own
  expansion state, so it resets when the parent unmounts it (switching jobs).
-->
<script lang="ts">
  import IconChevronRight from '$lib/icons/icon-chevron-right.svelte'
  import IconDownload from '$lib/icons/icon-download.svelte'
  import type { AdminBotLogEntry } from '$lib/utils/admin-bot-logs'
  import { downloadTextFile } from '$lib/utils/download'
  import { formatClockTime } from '$lib/utils/time'
  import { SvelteSet } from 'svelte/reactivity'

  interface Props {
    entries: AdminBotLogEntry[]
    raw: string
    jobId: string
  }

  let { entries, raw, jobId }: Props = $props()

  const expanded = new SvelteSet<number>()

  function toggle(index: number) {
    if (expanded.has(index)) {
      expanded.delete(index)
    } else {
      expanded.add(index)
    }
  }

  function hasExtra(entry: AdminBotLogEntry): boolean {
    return Object.keys(entry.extra).length > 0
  }

  function formatExtraValue(value: unknown): string {
    return typeof value === 'string' ? value : JSON.stringify(value)
  }

  function download() {
    downloadTextFile(`admin-bot-${jobId}.jsonl`, raw, 'application/jsonl')
  }
</script>

<log-viewer>
  <log-lines>
    {#each entries as entry, index (index)}
      {@const expandable = hasExtra(entry)}
      {@const isExpanded = expanded.has(index)}
      <log-line data-level={entry.level}>
        <button
          type="button"
          data-expandable={expandable || undefined}
          aria-expanded={expandable ? isExpanded : undefined}
          disabled={!expandable}
          onclick={() => expandable && toggle(index)}
        >
          <log-caret data-open={isExpanded || undefined}>
            {#if expandable}<IconChevronRight />{/if}
          </log-caret>
          <log-time>{formatClockTime(entry.time)}</log-time>
          <log-level>{entry.level.charAt(0).toUpperCase()}</log-level>
          <log-message>
            <log-prefix>[{entry.prefix}]</log-prefix>
            <log-text>{entry.line}</log-text>
          </log-message>
        </button>
        {#if expandable && isExpanded}
          <log-extra>
            {#each Object.entries(entry.extra) as [key, value] (key)}
              <extra-row>
                <extra-key>{key}:</extra-key>
                <extra-value>{formatExtraValue(value)}</extra-value>
              </extra-row>
            {/each}
          </log-extra>
        {/if}
      </log-line>
    {/each}
  </log-lines>
  <log-footer>
    <button type="button" onclick={download}>
      <IconDownload />
      Download logs
    </button>
  </log-footer>
</log-viewer>

<style>
  log-viewer {
    display: flex;
    flex-direction: column;
    overflow: clip;
    background: var(--background-l2);
    border-radius: var(--radius-md);
  }

  log-lines {
    display: block;
    max-block-size: 16rem;
    overflow-y: auto;
    font-family: var(--font-mono);
    font-size: var(--step--2);
  }

  log-line {
    display: block;

    & + & {
      border-block-start: 2px solid var(--background-l4);
    }

    button {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3xs);
      inline-size: 100%;
      padding: var(--space-3xs) var(--space-2xs);
      color: inherit;
      text-align: start;
      cursor: default;

      &[data-expandable] {
        cursor: pointer;

        &:hover {
          background: var(--background-l3);
        }
      }

      &:focus-visible {
        outline: 2px solid var(--ring);
        outline-offset: -2px;
      }
    }

    &[data-level='info'] :is(log-level, log-text) {
      color: var(--foreground-l3);
    }

    &[data-level='warn'] :is(log-level, log-text) {
      color: var(--foreground-l2);
    }

    &[data-level='error'] :is(log-level, log-text),
    &[data-level='fatal'] :is(log-level, log-text) {
      color: var(--foreground-destructive);
    }
  }

  log-caret {
    display: inline-flex;
    flex-shrink: 0;
    inline-size: 1rem;
    color: var(--foreground-l4);
    transition: rotate 0.15s ease;

    &[data-open] {
      rotate: 90deg;
    }

    :global(svg) {
      inline-size: 0.85rem;
      block-size: 0.85rem;
    }
  }

  log-time {
    flex-shrink: 0;
    color: var(--foreground-l4);
    font-variant-numeric: tabular-nums;
  }

  log-level {
    flex-shrink: 0;
    inline-size: 1ch;
    font-weight: 600;
    text-align: center;
  }

  log-message {
    min-inline-size: 0;
    flex: 1;
    overflow-wrap: anywhere;
  }

  log-prefix {
    color: var(--foreground-accent);
  }

  log-text {
    white-space: pre-wrap;
  }

  log-extra {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    padding: var(--space-3xs) var(--space-2xs) var(--space-3xs) 2rem;
    background: var(--background-l3);
    border-block-start: 2px solid var(--background-l4);
  }

  extra-row {
    display: flex;
    gap: var(--space-2xs);
  }

  extra-key {
    flex-shrink: 0;
    color: var(--foreground-l4);
  }

  extra-value {
    color: var(--foreground-l3);
    overflow-wrap: anywhere;
  }

  log-footer {
    display: flex;
    justify-content: flex-end;
    border-block-start: 2px solid var(--background-l4);

    button {
      display: inline-flex;
      align-items: center;
      gap: var(--space-3xs);
      padding: var(--space-3xs) var(--space-2xs);
      color: var(--foreground-l4);
      font-size: var(--step--2);
      cursor: pointer;

      &:hover {
        color: var(--foreground-l2);
      }

      &:focus-visible {
        outline: 2px solid var(--ring);
        outline-offset: -2px;
      }

      :global(svg) {
        inline-size: 0.85rem;
        block-size: 0.85rem;
      }
    }
  }
</style>

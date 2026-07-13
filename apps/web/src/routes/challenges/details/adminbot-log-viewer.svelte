<script lang="ts">
  import { IconCaretRight, IconDownload } from '$lib/icons'
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
  <log-lines tabindex="-1">
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
            {#if expandable}<IconCaretRight />{/if}
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
    border: 2px solid var(--border);
    border-radius: var(--radius-md);
  }

  log-lines {
    display: block;
    max-block-size: 16rem;
    padding-block: var(--space-3xs);
    overflow-y: auto;
    overscroll-behavior: none;
    font-family: var(--font-mono);
    font-size: var(--step--1);
  }

  log-line {
    display: block;

    button {
      display: flex;
      align-items: flex-start;
      gap: var(--space-3xs);
      inline-size: 100%;
      padding: 0.125rem var(--space-2xs);
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
    align-items: center;
    inline-size: 1em;
    block-size: 1lh;
    color: var(--foreground-l4);
    transition: rotate 0.15s ease;

    &[data-open] {
      rotate: 90deg;
    }

    :global(svg) {
      inline-size: 1em;
      block-size: 1em;
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
    border-block-start: 2px solid var(--border);

    button {
      display: inline-flex;
      align-items: center;
      gap: var(--space-3xs);
      padding: var(--space-3xs) var(--space-2xs);
      color: var(--foreground-l3);
      font-size: var(--step--1);
      cursor: pointer;

      &:hover {
        color: var(--foreground-l1);
      }

      &:focus-visible {
        outline: 2px solid var(--ring);
        outline-offset: -2px;
      }

      :global(svg) {
        inline-size: 1em;
        block-size: 1em;
      }
    }
  }
</style>

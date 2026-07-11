<script lang="ts">
  import { IconCheck, IconCopy } from '$lib/icons'
  import type { AlertType } from '$lib/utils/markdown'
  import { onDestroy } from 'svelte'

  type Props = {
    type: AlertType
    content: string
    parsedContent: string
  }

  let { type, content, parsedContent }: Props = $props()

  const labels: Record<AlertType, string> = {
    note: 'Note',
    tip: 'Tip',
    important: 'Important',
    warning: 'Warning',
    caution: 'Caution',
    connection: 'Connection',
  }

  const icons: Record<Exclude<AlertType, 'connection'>, string> = {
    note: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2c5.523 0 10 4.477 10 10a10 10 0 0 1-19.995.324L2 12l.004-.28C2.152 6.327 6.57 2 12 2m0 9h-1l-.117.007a1 1 0 0 0 0 1.986L11 13v3l.007.117a1 1 0 0 0 .876.876L12 17h1l.117-.007a1 1 0 0 0 .876-.876L14 16l-.007-.117a1 1 0 0 0-.764-.857l-.112-.02L13 15v-3l-.007-.117a1 1 0 0 0-.876-.876zm.01-3l-.127.007a1 1 0 0 0 0 1.986L12 10l.127-.007a1 1 0 0 0 0-1.986z"/></svg>',
    tip: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M4 11a1 1 0 0 1 .117 1.993L4 13H3a1 1 0 0 1-.117-1.993L3 11zm8-9a1 1 0 0 1 .993.883L13 3v1a1 1 0 0 1-1.993.117L11 4V3a1 1 0 0 1 1-1m9 9a1 1 0 0 1 .117 1.993L21 13h-1a1 1 0 0 1-.117-1.993L20 11zM4.893 4.893a1 1 0 0 1 1.32-.083l.094.083l.7.7a1 1 0 0 1-1.32 1.497l-.094-.083l-.7-.7a1 1 0 0 1 0-1.414m12.8 0a1 1 0 0 1 1.497 1.32l-.083.094l-.7.7a1 1 0 0 1-1.497-1.32l.083-.094zM14 18a1 1 0 0 1 1 1a3 3 0 0 1-6 0a1 1 0 0 1 .883-.993L10 18zM12 6a6 6 0 0 1 3.6 10.8a1 1 0 0 1-.471.192L15 17H9a1 1 0 0 1-.6-.2A6 6 0 0 1 12 6"/></svg>',
    important:
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="m12.4 2l.253.005a6.34 6.34 0 0 1 5.235 3.166l.089.163l.178.039a6.33 6.33 0 0 1 4.254 3.406l.105.228a6.334 6.334 0 0 1-5.74 8.865l-.144-.002l-.037.052a5.26 5.26 0 0 1-5.458 1.926l-.186-.051l-3.435 2.06a1 1 0 0 1-1.508-.743L6 21v-2.435l-.055-.026a3.67 3.67 0 0 1-1.554-1.498l-.102-.199a3.67 3.67 0 0 1-.312-2.14l.038-.21l-.116-.092a5.8 5.8 0 0 1-1.887-6.025l.071-.238a5.8 5.8 0 0 1 5.42-4.004h.157l.15-.165a6.33 6.33 0 0 1 4.33-1.963zM14 13H9a1 1 0 0 0 0 2h5a1 1 0 0 0 0-2m3-4H7a1 1 0 1 0 0 2h10a1 1 0 0 0 0-2"/></svg>',
    warning:
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M12 1.67c.955 0 1.845.467 2.39 1.247l.105.16l8.114 13.548a2.914 2.914 0 0 1-2.307 4.363l-.195.008H3.882a2.914 2.914 0 0 1-2.582-4.2l.099-.185l8.11-13.538A2.91 2.91 0 0 1 12 1.67M12.01 15l-.127.007a1 1 0 0 0 0 1.986L12 17l.127-.007a1 1 0 0 0 0-1.986zM12 8a1 1 0 0 0-.993.883L11 9v4l.007.117a1 1 0 0 0 1.986 0L13 13V9l-.007-.117A1 1 0 0 0 12 8"/></svg>',
    caution:
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M14.897 1a4 4 0 0 1 2.664 1.016l.165.156l4.1 4.1a4 4 0 0 1 1.168 2.605l.006.227v5.794a4 4 0 0 1-1.016 2.664l-.156.165l-4.1 4.1a4 4 0 0 1-2.603 1.168l-.227.006H9.103a4 4 0 0 1-2.664-1.017l-.165-.156l-4.1-4.1a4 4 0 0 1-1.168-2.604L1 14.897V9.103a4 4 0 0 1 1.016-2.664l.156-.165l4.1-4.1a4 4 0 0 1 2.605-1.168L9.104 1zM12.01 15l-.127.007a1 1 0 0 0 0 1.986L12 17l.127-.007a1 1 0 0 0 0-1.986zM12 7a1 1 0 0 0-.993.883L11 8v4l.007.117a1 1 0 0 0 1.986 0L13 12V8l-.007-.117A1 1 0 0 0 12 7"/></svg>',
  }

  let copied = $state(false)
  let timeout: ReturnType<typeof setTimeout> | undefined
  onDestroy(() => clearTimeout(timeout))

  const trimmed = $derived(
    type === 'connection' ? content.trim().replace(/^`+|`+$/g, '') : content.trim()
  )
  const isUrl = $derived(/^https?:\/\//.test(trimmed))
  const CopyIcon = $derived(copied ? IconCheck : IconCopy)

  function copy() {
    navigator.clipboard.writeText(trimmed)
    copied = true
    clearTimeout(timeout)
    timeout = setTimeout(() => (copied = false), 1500)
  }
</script>

{#if type === 'connection'}
  <markdown-alert data-type="connection">
    <alert-header>
      <span>{labels.connection}</span>
      <button type="button" onclick={copy} title="Copy">
        <CopyIcon />
      </button>
    </alert-header>
    <alert-body>
      {#if isUrl}
        <a href={trimmed} target="_blank" rel="noopener noreferrer">{trimmed}</a>
      {:else}
        <code>{trimmed}</code>
      {/if}
    </alert-body>
  </markdown-alert>
{:else}
  <markdown-alert data-type={type}>
    <alert-header>
      {@html icons[type]}
      <span>{labels[type]}</span>
    </alert-header>
    <alert-body>
      {@html parsedContent}
    </alert-body>
  </markdown-alert>
{/if}

<style>
  markdown-alert {
    --accent: var(--foreground-l1);

    display: block;

    &:not([data-type='connection']) {
      border-inline-start: 4px solid var(--accent);
      padding-inline-start: var(--space-s);
    }

    &[data-type='note'] {
      --accent: var(--sky-a11);
    }

    &[data-type='tip'] {
      --accent: var(--foreground-green-l1);
    }

    &[data-type='important'] {
      --accent: var(--purple-a11);
    }

    &[data-type='warning'] {
      --accent: var(--foreground-yellow-l1);
    }

    &[data-type='caution'] {
      --accent: var(--foreground-red-l1);
    }

    &[data-type='connection'] {
      overflow: hidden;
      border: 2px solid var(--border);
      border-radius: var(--radius-md);

      alert-header {
        padding: var(--space-3xs) var(--space-s);
        color: var(--foreground-l3);
        font-weight: inherit;
        background: var(--background-l3);
      }

      alert-body {
        padding: var(--space-3xs) var(--space-s);
      }
    }
  }

  alert-header {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    padding-block-end: var(--space-3xs);
    color: var(--accent);
    font-weight: var(--font-weight-medium);

    :global(svg) {
      flex-shrink: 0;
    }
  }

  alert-body {
    display: block;
    color: var(--foreground-prose);

    > :global(:first-child) {
      margin-block-start: 0;
    }

    > :global(:last-child) {
      margin-block-end: 0;
    }
  }

  button {
    display: flex;
    margin-inline-start: auto;
    padding: var(--space-3xs);
    cursor: pointer;
    opacity: 0.6;

    &:hover {
      opacity: 1;
    }
  }

  a,
  code {
    display: block;
    font-family: var(--font-mono);
  }

  code {
    padding: 0;
    color: var(--foreground-l1);
    background: transparent;
    border-radius: 0;
  }

  a {
    color: var(--foreground-prose-link);
  }
</style>

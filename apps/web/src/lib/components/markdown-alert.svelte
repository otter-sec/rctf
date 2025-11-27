<script lang="ts">
  import { IconCheck, IconCopy } from '$lib/icons'
  import type { AlertType } from '$lib/markdown'
  import { cn } from '$lib/utils'

  interface AlertConfig {
    label: string
    border: string
    text: string
    icon: string
  }

  const configs: Record<AlertType, AlertConfig> = {
    note: {
      label: 'Note',
      border: 'border-foreground-blue-l1',
      text: 'text-foreground-blue-l1',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2c5.523 0 10 4.477 10 10a10 10 0 0 1-19.995.324L2 12l.004-.28C2.152 6.327 6.57 2 12 2m0 9h-1l-.117.007a1 1 0 0 0 0 1.986L11 13v3l.007.117a1 1 0 0 0 .876.876L12 17h1l.117-.007a1 1 0 0 0 .876-.876L14 16l-.007-.117a1 1 0 0 0-.764-.857l-.112-.02L13 15v-3l-.007-.117a1 1 0 0 0-.876-.876zm.01-3l-.127.007a1 1 0 0 0 0 1.986L12 10l.127-.007a1 1 0 0 0 0-1.986z"/></svg>',
    },
    tip: {
      label: 'Tip',
      border: 'border-foreground-green-l1',
      text: 'text-foreground-green-l1',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M4 11a1 1 0 0 1 .117 1.993L4 13H3a1 1 0 0 1-.117-1.993L3 11zm8-9a1 1 0 0 1 .993.883L13 3v1a1 1 0 0 1-1.993.117L11 4V3a1 1 0 0 1 1-1m9 9a1 1 0 0 1 .117 1.993L21 13h-1a1 1 0 0 1-.117-1.993L20 11zM4.893 4.893a1 1 0 0 1 1.32-.083l.094.083l.7.7a1 1 0 0 1-1.32 1.497l-.094-.083l-.7-.7a1 1 0 0 1 0-1.414m12.8 0a1 1 0 0 1 1.497 1.32l-.083.094l-.7.7a1 1 0 0 1-1.497-1.32l.083-.094zM14 18a1 1 0 0 1 1 1a3 3 0 0 1-6 0a1 1 0 0 1 .883-.993L10 18zM12 6a6 6 0 0 1 3.6 10.8a1 1 0 0 1-.471.192L15 17H9a1 1 0 0 1-.6-.2A6 6 0 0 1 12 6"/></svg>',
    },
    important: {
      label: 'Important',
      border: 'border-foreground-purple-l1',
      text: 'text-foreground-purple-l1',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="m12.4 2l.253.005a6.34 6.34 0 0 1 5.235 3.166l.089.163l.178.039a6.33 6.33 0 0 1 4.254 3.406l.105.228a6.334 6.334 0 0 1-5.74 8.865l-.144-.002l-.037.052a5.26 5.26 0 0 1-5.458 1.926l-.186-.051l-3.435 2.06a1 1 0 0 1-1.508-.743L6 21v-2.435l-.055-.026a3.67 3.67 0 0 1-1.554-1.498l-.102-.199a3.67 3.67 0 0 1-.312-2.14l.038-.21l-.116-.092a5.8 5.8 0 0 1-1.887-6.025l.071-.238a5.8 5.8 0 0 1 5.42-4.004h.157l.15-.165a6.33 6.33 0 0 1 4.33-1.963zM14 13H9a1 1 0 0 0 0 2h5a1 1 0 0 0 0-2m3-4H7a1 1 0 1 0 0 2h10a1 1 0 0 0 0-2"/></svg>',
    },
    warning: {
      label: 'Warning',
      border: 'border-foreground-yellow-l1',
      text: 'text-foreground-yellow-l1',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M12 1.67c.955 0 1.845.467 2.39 1.247l.105.16l8.114 13.548a2.914 2.914 0 0 1-2.307 4.363l-.195.008H3.882a2.914 2.914 0 0 1-2.582-4.2l.099-.185l8.11-13.538A2.91 2.91 0 0 1 12 1.67M12.01 15l-.127.007a1 1 0 0 0 0 1.986L12 17l.127-.007a1 1 0 0 0 0-1.986zM12 8a1 1 0 0 0-.993.883L11 9v4l.007.117a1 1 0 0 0 1.986 0L13 13V9l-.007-.117A1 1 0 0 0 12 8"/></svg>',
    },
    caution: {
      label: 'Caution',
      border: 'border-foreground-red-l1',
      text: 'text-foreground-red-l1',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M14.897 1a4 4 0 0 1 2.664 1.016l.165.156l4.1 4.1a4 4 0 0 1 1.168 2.605l.006.227v5.794a4 4 0 0 1-1.016 2.664l-.156.165l-4.1 4.1a4 4 0 0 1-2.603 1.168l-.227.006H9.103a4 4 0 0 1-2.664-1.017l-.165-.156l-4.1-4.1a4 4 0 0 1-1.168-2.604L1 14.897V9.103a4 4 0 0 1 1.016-2.664l.156-.165l4.1-4.1a4 4 0 0 1 2.605-1.168L9.104 1zM12.01 15l-.127.007a1 1 0 0 0 0 1.986L12 17l.127-.007a1 1 0 0 0 0-1.986zM12 7a1 1 0 0 0-.993.883L11 8v4l.007.117a1 1 0 0 0 1.986 0L13 12V8l-.007-.117A1 1 0 0 0 12 7"/></svg>',
    },
    connection: { label: 'Connection', border: '', text: '', icon: '' },
  }

  interface Props {
    type: AlertType
    content: string
    parsedContent: string
  }

  let { type, content, parsedContent }: Props = $props()

  let copied = $state(false)
  let timeout: ReturnType<typeof setTimeout>

  const config = $derived(configs[type])
  const trimmed = $derived(content.trim())
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
  <div class="my-4 overflow-hidden rounded-md border-2 border-border">
    <div
      class="flex items-center gap-2 bg-background-l3 px-4 py-1 text-foreground-l3"
    >
      <span>{config.label}</span>
      <button
        class="ml-auto rounded p-1 opacity-60 hover:opacity-100"
        onclick={copy}
        title="Copy"
      >
        <CopyIcon class="size-4" />
      </button>
    </div>
    <div class="px-4 py-1">
      {#if isUrl}
        <a
          href={trimmed}
          target="_blank"
          rel="noopener noreferrer"
          class="block font-mono text-foreground-prose-link underline-offset-2 hover:underline"
        >
          {trimmed}
        </a>
      {:else}
        <code class="block font-mono text-foreground-prose">{trimmed}</code>
      {/if}
    </div>
  </div>
{:else}
  <div class={cn('my-4 border-l-4 pl-4', config.border)}>
    <div class={cn('flex items-center gap-2 pb-1', config.text)}>
      <span class="flex shrink-0">{@html config.icon}</span>
      <span class="font-medium">{config.label}</span>
    </div>
    <div
      class="text-foreground-prose *:first:mt-0! [&>:first-child_*]:mt-0! *:last:mb-0! [&>:last-child_*]:mb-0!"
    >
      {@html parsedContent}
    </div>
  </div>
{/if}

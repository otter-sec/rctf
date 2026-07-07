<script lang="ts">
  import IconDownload from '$lib/icons/icon-download.svelte'
  import IconX from '$lib/icons/icon-x.svelte'
  import type { LeaderboardGraphSeries } from '$lib/query/leaderboard'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import Dialog from '$lib/ui/dialog.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import type { CategoryGroup } from '../model/transforms'
  import {
    buildFilename,
    DEFAULT_EXPORT_SETTINGS,
    DEFAULT_OPTIONS,
    type ExportSettings,
    type ScreenshotOptions,
    type ScreenshotTeam,
  } from './options'
  import ScreenshotOptionsPanel from './screenshot-options-panel.svelte'
  import ScreenshotPreview from './screenshot-preview.svelte'

  interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    teams: ScreenshotTeam[]
    selfTeam: ScreenshotTeam | null
    graphData: LeaderboardGraphSeries[]
    categoryGroups: CategoryGroup[]
    solvesByTeam: Map<string, Set<string>>
    ctfName: string
    startTime: number | null
    endTime: number | null
  }

  let {
    open,
    onOpenChange,
    teams,
    selfTeam,
    graphData,
    categoryGroups,
    solvesByTeam,
    ctfName,
    startTime,
    endTime,
  }: Props = $props()

  let options = $state<ScreenshotOptions>({ ...DEFAULT_OPTIONS })
  let exportSettings = $state<ExportSettings>({ ...DEFAULT_EXPORT_SETTINGS })
  let previewRef = $state<HTMLElement | null>(null)
  let isExporting = $state(false)

  async function handleExport() {
    const container = previewRef?.querySelector<HTMLElement>('[data-screenshot-container]')
    if (!container) {
      toast.error('Preview not ready')
      return
    }

    isExporting = true
    try {
      const { domToPng, domToJpeg, domToWebp } = await import('modern-screenshot')
      const exportFn = { png: domToPng, jpeg: domToJpeg, webp: domToWebp }[exportSettings.format]
      const dataUrl = await exportFn(container, { scale: exportSettings.scale })

      // Fetch into a blob first; webkit chokes on very large data URLs in anchors.
      const blob = await (await fetch(dataUrl)).blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = buildFilename(exportSettings.format)
      link.href = objectUrl
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)

      toast.success('Screenshot exported')
    } catch (error) {
      console.error('Screenshot export failed:', error)
      toast.error('Failed to export screenshot')
    } finally {
      isExporting = false
    }
  }
</script>

<Dialog {open} {onOpenChange} title="Export screenshot" titleHidden flush>
  {#snippet children({ closeProps })}
    <screenshot-modal>
      <modal-head>
        <h2>Export screenshot</h2>
        <button {...closeProps} type="button" data-close aria-label="Close">
          <IconX aria-hidden="true" />
        </button>
      </modal-head>

      <modal-body>
        <modal-sidebar>
          <sidebar-scroll>
            <ScreenshotOptionsPanel {options} {exportSettings} hasSelf={selfTeam !== null} />
          </sidebar-scroll>
          <export-bar>
            <Button onclick={handleExport} disabled={isExporting}>
              {#if isExporting}
                <Spinner label="Exporting" />
                Exporting…
              {:else}
                <IconDownload aria-hidden="true" />
                Export {exportSettings.format.toUpperCase()}
              {/if}
            </Button>
          </export-bar>
        </modal-sidebar>

        <preview-pane>
          <checker-board
            {@attach (node: HTMLElement) => {
              previewRef = node
              return () => {
                if (previewRef === node) previewRef = null
              }
            }}
          >
            <ScreenshotPreview
              {teams}
              {selfTeam}
              {graphData}
              {categoryGroups}
              {solvesByTeam}
              {options}
              {ctfName}
              {startTime}
              {endTime}
              shadow
            />
          </checker-board>
        </preview-pane>
      </modal-body>
    </screenshot-modal>
  {/snippet}
</Dialog>

<style>
  :global([data-part='positioner']:has(screenshot-modal)) {
    --dialog-max-inline-size: 90svw;
    --dialog-block-size: 90svh;
    --dialog-max-block-size: 90svh;
    --dialog-content-background: var(--background-l2);

    @media (width >= 48rem) {
      --dialog-max-inline-size: 95svw;
      --dialog-block-size: 85svh;
      --dialog-max-block-size: 56.25rem;
    }
  }

  screenshot-modal {
    display: flex;
    flex-direction: column;
    block-size: 100%;
    min-block-size: 0;
  }

  modal-head {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2xs) var(--space-s);
    border-block-end: 2px solid var(--border);

    h2 {
      font-size: var(--step-1);
    }
  }

  button[data-close] {
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: 2rem;
    block-size: 2rem;
    color: var(--foreground-l3);
    background: transparent;
    border-radius: var(--radius-sm);
    cursor: pointer;

    :global(svg) {
      inline-size: 1.25rem;
      block-size: 1.25rem;
    }

    &:hover {
      color: var(--foreground-l0);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }
  }

  modal-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
    overflow: hidden;
  }

  modal-sidebar {
    display: flex;
    flex-shrink: 0;
    flex-direction: column;
    inline-size: 100%;
    max-block-size: 50svh;
    border-block-end: 2px solid var(--border);
  }

  sidebar-scroll {
    display: block;
    flex: 1;
    min-block-size: 0;
    overflow-y: auto;
    padding: var(--space-s);
  }

  export-bar {
    display: block;
    flex-shrink: 0;
    padding: var(--space-2xs) var(--space-s);
    border-block-start: 2px solid var(--border);

    :global(button) {
      inline-size: 100%;
    }
  }

  preview-pane {
    display: flex;
    flex: 1;
    min-inline-size: 0;
    overflow: hidden;
  }

  checker-board {
    --checker-size: 0.75rem;
    --checker-color-1: var(--background-l2);
    --checker-color-2: var(--background-l3);
    display: flex;
    flex: 1;
    overflow: auto;
    padding: 1rem;
    background-color: var(--checker-color-2);
    background-image:
      linear-gradient(45deg, var(--checker-color-1) 25%, transparent 25%),
      linear-gradient(-45deg, var(--checker-color-1) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, var(--checker-color-1) 75%),
      linear-gradient(-45deg, transparent 75%, var(--checker-color-1) 75%);
    background-size: calc(var(--checker-size) * 2) calc(var(--checker-size) * 2);
    background-position:
      0 0,
      0 var(--checker-size),
      var(--checker-size) calc(var(--checker-size) * -1),
      calc(var(--checker-size) * -1) 0;

    :global(screenshot-preview) {
      flex-shrink: 0;
      margin: auto;
    }
  }

  @media (width >= 48rem) {
    modal-body {
      flex-direction: row;
    }

    modal-sidebar {
      inline-size: 21.5rem;
      max-block-size: none;
      border-block-end: 0;
      border-inline-end: 2px solid var(--border);
    }

    checker-board {
      padding: 2rem;
    }
  }
</style>

<script lang="ts">
  import {
    Button,
    Checkbox,
    Dialog,
    Input,
    Label,
    ScrollArea,
    Section,
    Select,
    Spinner,
    Tooltip,
  } from '$lib/components'
  import { IconDownload, IconX } from '$lib/icons'
  import { toast } from 'svelte-sonner'
  import ScoresScreenshotPreview, {
    type ScreenshotOptions,
  } from './scores-screenshot-preview.svelte'
  import type { CategoryGroup } from './types'

  interface TeamEntry {
    id: string
    rank: number
    name: string
    avatarUrl: string | null
    countryCode: string | null
    statusText: string | null
    score: number
    solveCount: number
    isCurrentUser: boolean
    sparklineData?: { time: number; score: number }[]
  }

  interface GraphEntry {
    id: string
    name: string
    points: { time: number; score: number }[]
  }

  interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    teams: TeamEntry[]
    selfTeam: TeamEntry | null
    graphData: GraphEntry[]
    categoryGroups: CategoryGroup[]
    solvesByTeam: Map<string, Set<string>>
    ctfName: string
    startTime: number | null
    endTime: number | null
  }

  let {
    open = $bindable(),
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

  let previewRef = $state<HTMLElement | null>(null)
  let isExporting = $state(false)

  const teamCountOptions = [3, 5, 10, 20] as const
  type TeamCountOption = (typeof teamCountOptions)[number]

  const scaleOptions = [
    { value: 1, label: '1x' },
    { value: 2, label: '2x' },
    { value: 3, label: '3x' },
  ] as const

  const formatOptions = [
    { value: 'png' as const, label: 'PNG' },
    { value: 'jpeg' as const, label: 'JPEG' },
    { value: 'webp' as const, label: 'WebP' },
  ] as const

  let options = $state<ScreenshotOptions>({
    teamCount: 5,
    graphTeamCount: 10,
    showSelf: true,
    showGraph: true,
    showAvatars: true,
    showFlags: true,
    showStatuses: true,
    showSolveCount: true,
    showSparklines: true,
    showMatrix: true,
    subtitle: '',
    showHeader: true,
    emphasizeListedTeams: true,
    emphasizeSelfOnly: false,
  })

  let exportSettings = $state({
    scale: 2,
    format: 'png' as 'png' | 'jpeg' | 'webp',
  })

  async function handleExport() {
    if (!previewRef) {
      toast.error('Preview not ready')
      return
    }

    isExporting = true
    try {
      const container = previewRef.querySelector('[data-screenshot-container]') as HTMLElement
      if (!container) {
        throw new Error('Screenshot container not found')
      }

      const { domToPng, domToJpeg, domToWebp } = await import('modern-screenshot')
      const exportFns = {
        png: domToPng,
        jpeg: domToJpeg,
        webp: domToWebp,
      }
      const exportFn = exportFns[exportSettings.format]

      const dataUrl = await exportFn(container, {
        scale: exportSettings.scale,
      })

      const timestamp = new Date().toISOString().slice(0, 10)
      const filename = `leaderboard-${timestamp}.${exportSettings.format}`

      // Needed for webkit
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.download = filename
      link.href = objectUrl
      link.click()
      link.remove()

      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)

      toast.success('Screenshot exported successfully!')
    } catch (err) {
      console.error('Export failed:', err)
      toast.error('Failed to export screenshot')
    } finally {
      isExporting = false
    }
  }

  function handleTeamCountChange(value: string | undefined) {
    if (value) {
      options.teamCount = parseInt(value) as TeamCountOption
    }
  }

  function handleGraphTeamCountChange(value: string | undefined) {
    if (value) {
      options.graphTeamCount = parseInt(value) as TeamCountOption
    }
  }

  function handleScaleChange(value: string | undefined) {
    if (value) {
      exportSettings.scale = parseInt(value)
    }
  }

  function handleFormatChange(value: string | undefined) {
    if (value) {
      exportSettings.format = value as 'png' | 'jpeg' | 'webp'
    }
  }

  function previewAttachment(element: HTMLElement) {
    previewRef = element
    return () => {
      if (previewRef === element) previewRef = null
    }
  }
</script>

<Dialog.Root bind:open onOpenChange={v => onOpenChange(v)}>
  <Dialog.Content showCloseButton={false} class="screenshot-dialog">
    <modal-head>
      <Dialog.Title>Export screenshot</Dialog.Title>
      <Dialog.Close class="close">
        <IconX class="icon" />
        <span class="visually-hidden">Close</span>
      </Dialog.Close>
    </modal-head>

    <modal-body>
      <modal-sidebar>
        <ScrollArea class="controls-scroll" fadeColor="background-l2">
          <modal-controls>
            <Section.Root>
              <Section.Header>Content</Section.Header>
              <Section.Content class="modal-section">
                <modal-field>
                  <Label for="team-count" class="modal-label">Teams in list</Label>
                  <Select.Root
                    type="single"
                    value={options.teamCount.toString()}
                    onValueChange={handleTeamCountChange}
                  >
                    <Select.Trigger id="team-count" class="modal-select">
                      {options.teamCount} teams
                    </Select.Trigger>
                    <Select.Content>
                      {#each teamCountOptions as count (count)}
                        <Select.Item value={count.toString()}>{count} teams</Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                </modal-field>

                <modal-field>
                  <Label for="graph-team-count" class="modal-label">Teams in graph</Label>
                  <Select.Root
                    type="single"
                    value={options.graphTeamCount.toString()}
                    onValueChange={handleGraphTeamCountChange}
                  >
                    <Select.Trigger id="graph-team-count" class="modal-select">
                      {options.graphTeamCount} teams
                    </Select.Trigger>
                    <Select.Content>
                      {#each teamCountOptions as count (count)}
                        <Select.Item value={count.toString()}>{count} teams</Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                </modal-field>

                <modal-field>
                  <Label for="subtitle" class="modal-label">Subtitle</Label>
                  <Input
                    id="subtitle"
                    bind:value={options.subtitle}
                    placeholder="Optional subtitle"
                    class="modal-input"
                  />
                </modal-field>
              </Section.Content>
            </Section.Root>

            <Section.Root>
              <Section.Header>Display</Section.Header>
              <Section.Content class="modal-section" data-compact>
                <label>
                  <Checkbox bind:checked={options.showHeader} />
                  <span>Show header</span>
                </label>

                <label>
                  <Checkbox bind:checked={options.showGraph} />
                  <span>Show graph</span>
                </label>

                {#if options.showGraph && selfTeam}
                  {@const selfDisabled = !options.showSelf}
                  {#if selfDisabled}
                    <Tooltip.Root>
                      <Tooltip.Trigger class="toggle" data-inset data-disabled>
                        <Checkbox checked={false} disabled />
                        <span>Emphasize self only</span>
                      </Tooltip.Trigger>
                      <Tooltip.Content>Requires "Show your team"</Tooltip.Content>
                    </Tooltip.Root>
                  {:else}
                    <label data-inset>
                      <Checkbox bind:checked={options.emphasizeSelfOnly} />
                      <span>Emphasize self only</span>
                    </label>
                  {/if}
                {/if}

                {#if options.showGraph}
                  {@const canEmphasize = options.graphTeamCount > options.teamCount}
                  {@const isDisabled = options.emphasizeSelfOnly || !canEmphasize}
                  {#if isDisabled}
                    <Tooltip.Root>
                      <Tooltip.Trigger class="toggle" data-inset data-disabled>
                        <Checkbox checked={options.emphasizeListedTeams} disabled />
                        <span>Emphasize listed teams</span>
                      </Tooltip.Trigger>
                      <Tooltip.Content>
                        {#if options.emphasizeSelfOnly}
                          Overridden by "Emphasize self only"
                        {:else}
                          Requires more graphed teams than listed
                        {/if}
                      </Tooltip.Content>
                    </Tooltip.Root>
                  {:else}
                    <label data-inset>
                      <Checkbox bind:checked={options.emphasizeListedTeams} />
                      <span>Emphasize listed teams</span>
                    </label>
                  {/if}
                {/if}

                <label>
                  <Checkbox bind:checked={options.showAvatars} />
                  <span>Show avatars</span>
                </label>

                <label>
                  <Checkbox bind:checked={options.showFlags} />
                  <span>Show flags</span>
                </label>

                <label>
                  <Checkbox bind:checked={options.showStatuses} />
                  <span>Show statuses</span>
                </label>

                <label>
                  <Checkbox bind:checked={options.showSolveCount} />
                  <span>Show solve count</span>
                </label>

                <label>
                  <Checkbox bind:checked={options.showSparklines} />
                  <span>Show sparklines</span>
                </label>

                <label>
                  <Checkbox bind:checked={options.showMatrix} />
                  <span>Show category matrix</span>
                </label>

                {#if selfTeam}
                  <label>
                    <Checkbox bind:checked={options.showSelf} />
                    <span>Show your team</span>
                  </label>
                {/if}
              </Section.Content>
            </Section.Root>

            <Section.Root>
              <Section.Header>Export</Section.Header>
              <Section.Content class="modal-section">
                <modal-field>
                  <Label for="scale" class="modal-label">Resolution</Label>
                  <Select.Root
                    type="single"
                    value={exportSettings.scale.toString()}
                    onValueChange={handleScaleChange}
                  >
                    <Select.Trigger id="scale" class="modal-select">
                      {scaleOptions.find(s => s.value === exportSettings.scale)?.label}
                    </Select.Trigger>
                    <Select.Content>
                      {#each scaleOptions as scale (scale.value)}
                        <Select.Item value={scale.value.toString()}>{scale.label}</Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                </modal-field>

                <modal-field>
                  <Label for="format" class="modal-label">Format</Label>
                  <Select.Root
                    type="single"
                    value={exportSettings.format}
                    onValueChange={handleFormatChange}
                  >
                    <Select.Trigger id="format" class="modal-select">
                      {formatOptions.find(f => f.value === exportSettings.format)?.label}
                    </Select.Trigger>
                    <Select.Content>
                      {#each formatOptions as format (format.value)}
                        <Select.Item value={format.value}>{format.label}</Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                </modal-field>
              </Section.Content>
            </Section.Root>
          </modal-controls>
        </ScrollArea>
        <export-bar>
          <Button class="export-button" onclick={handleExport} disabled={isExporting}>
            {#if isExporting}
              <Spinner class="icon" />
              Exporting...
            {:else}
              <IconDownload class="icon" />
              Export {exportSettings.format.toUpperCase()}
            {/if}
          </Button>
        </export-bar>
      </modal-sidebar>

      <preview-pane>
        <preview-scroll-wrap>
          <ScrollArea class="preview-scroll" orientation="both" fadeColor="background-l2">
            <checker-board {@attach previewAttachment}>
              <ScoresScreenshotPreview
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
          </ScrollArea>
        </preview-scroll-wrap>
      </preview-pane>
    </modal-body>
  </Dialog.Content>
</Dialog.Root>

<style>
  :global(.screenshot-dialog) {
    width: 90svw;
    height: 90svh;
    display: flex;
    flex-direction: column;
    gap: 0;
    padding-block: 0;
    padding-inline: 0;
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    background: var(--background-l2);
  }

  modal-head {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    padding-block: calc(var(--spacing) * 3);
    padding-inline: calc(var(--spacing) * 4);
    border-block-end: 2px solid var(--border);
  }

  :global(.close) {
    border-radius: var(--radius-xs);
    color: var(--foreground-l3);
    transition: color 150ms ease;

    &:hover {
      color: var(--foreground-l0);
    }
  }

  :global(.close .icon),
  :global(.export-button .icon) {
    width: 1.25rem;
    height: 1.25rem;
  }

  :global(.export-button .icon) {
    width: 1rem;
    height: 1rem;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }

  modal-body {
    min-height: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  modal-sidebar {
    width: 100%;
    max-height: 50vh;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    border-block-end: 2px solid var(--border);
  }

  :global(.controls-scroll) {
    min-height: 0;
    flex: 1;
  }

  modal-controls {
    display: flex;
    flex-direction: column;
    gap: calc(var(--spacing) * 3);
    padding-block: calc(var(--spacing) * 3);
    padding-inline: calc(var(--spacing) * 4);

    label,
    :global(.toggle) {
      display: flex;
      align-items: center;
      gap: calc(var(--spacing) * 2);
      color: var(--foreground-l2);
      font-size: var(--text-sm);
    }

    label {
      cursor: pointer;

      &[data-inset] {
        padding-inline-start: calc(var(--spacing) * 4);
      }
    }
  }

  :global(.modal-section) {
    display: flex;
    flex-direction: column;
    gap: calc(var(--spacing) * 3);

    &[data-compact] {
      gap: calc(var(--spacing) * 2);
    }
  }

  modal-field {
    display: flex;
    flex-direction: column;
    gap: calc(var(--spacing) * 1.5);
  }

  :global(.modal-label) {
    color: var(--foreground-l2);
    font-size: var(--text-xs);
  }

  :global(.modal-select) {
    width: 100%;
  }

  :global(.modal-input) {
    height: calc(var(--spacing) * 9);
  }

  :global(.toggle[data-inset]) {
    padding-inline-start: calc(var(--spacing) * 4);
  }

  :global(.toggle[data-disabled]) {
    cursor: not-allowed;
    opacity: 0.5;
  }

  export-bar {
    display: block;
    padding-block: calc(var(--spacing) * 3);
    padding-inline: calc(var(--spacing) * 4);
    border-block-start: 2px solid var(--border);
  }

  :global(.export-button) {
    width: 100%;
  }

  preview-pane {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-end-start-radius: var(--radius-lg);
    border-end-end-radius: var(--radius-lg);
  }

  preview-scroll-wrap {
    display: block;
    min-height: 0;
    flex: 1;
  }

  :global(.preview-scroll) {
    height: 100%;
  }

  checker-board {
    --checker-size: calc(var(--spacing) * 3);
    --checker-color-1: var(--background-l2);
    --checker-color-2: var(--background-l3);
    display: flex;
    align-items: center;
    justify-content: center;
    padding-block: calc(var(--spacing) * 4);
    padding-inline: calc(var(--spacing) * 4);
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
    background-color: var(--checker-color-2);
  }

  @media (width >= 48rem) {
    :global(.screenshot-dialog) {
      width: 95vw;
      max-width: 95vw;
      height: 85vh;
      max-height: 56.25rem;
    }

    modal-head {
      padding-inline: calc(var(--spacing) * 5);
    }

    modal-body {
      flex-direction: row;
    }

    modal-sidebar {
      width: 21.5rem;
      max-height: none;
      border-inline-end: 2px solid var(--border);
      border-block-end: 0;
    }

    modal-controls,
    export-bar {
      padding-inline: calc(var(--spacing) * 5);
    }

    preview-pane {
      border-end-start-radius: 0;
    }

    checker-board {
      padding-block: calc(var(--spacing) * 8);
      padding-inline: calc(var(--spacing) * 8);
    }
  }
</style>

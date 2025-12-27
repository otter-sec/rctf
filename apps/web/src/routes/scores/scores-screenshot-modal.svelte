<script lang="ts">
  import { domToPng, domToJpeg, domToSvg, domToWebp } from 'modern-screenshot'
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
  import { cn } from '$lib/utils'
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
    { value: 'svg' as const, label: 'SVG' },
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
    format: 'png' as 'png' | 'jpeg' | 'webp' | 'svg',
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

      const exportFns = {
        png: domToPng,
        jpeg: domToJpeg,
        webp: domToWebp,
        svg: domToSvg,
      }
      const exportFn = exportFns[exportSettings.format]

      const dataUrl = await exportFn(container, {
        scale: exportSettings.scale,
        backgroundColor: '#0f0f0f',
        quality: exportSettings.format === 'jpeg' || exportSettings.format === 'webp' ? 0.95 : 1,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
      })

      const link = document.createElement('a')
      const timestamp = new Date().toISOString().slice(0, 10)
      link.download = `leaderboard-${timestamp}.${exportSettings.format}`
      link.href = dataUrl
      link.click()

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
      exportSettings.format = value as 'png' | 'jpeg' | 'webp' | 'svg'
    }
  }
</script>

<Dialog.Root bind:open onOpenChange={v => onOpenChange(v)}>
  <Dialog.Content
    showCloseButton={false}
    class="bg-background-l2 flex h-[90svh] w-[90svw] flex-col gap-0 rounded-lg border-2 p-0 md:h-[85vh] md:max-h-[900px] md:w-[95vw] md:max-w-[95vw]!"
  >
    <Dialog.Header
      class="flex shrink-0 flex-row items-center justify-between border-b-2 px-4 py-3 md:px-5"
    >
      <Dialog.Title>Export screenshot</Dialog.Title>
      <Dialog.Close
        class="text-foreground-l3 hover:text-foreground-l0 rounded-sm transition-colors"
      >
        <IconX class="size-5" />
        <span class="sr-only">Close</span>
      </Dialog.Close>
    </Dialog.Header>

    <div class="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
      <div
        class="flex max-h-[50vh] w-full shrink-0 flex-col border-b-2 md:max-h-none md:w-86 md:border-r-2 md:border-b-0"
      >
        <ScrollArea class="min-h-0 flex-1" fadeColor="background-l2">
          <div class="flex flex-col gap-3 px-4 py-3 md:px-5">
            <Section.Root>
              <Section.Header>Content</Section.Header>
              <Section.Content class="flex flex-col gap-3">
                <div class="flex flex-col gap-1.5">
                  <Label for="team-count" class="text-foreground-l2 text-xs">Teams in list</Label>
                  <Select.Root
                    type="single"
                    value={options.teamCount.toString()}
                    onValueChange={handleTeamCountChange}
                  >
                    <Select.Trigger id="team-count" class="w-full">
                      {options.teamCount} teams
                    </Select.Trigger>
                    <Select.Content>
                      {#each teamCountOptions as count}
                        <Select.Item value={count.toString()}>{count} teams</Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                </div>

                <div class="flex flex-col gap-1.5">
                  <Label for="graph-team-count" class="text-foreground-l2 text-xs"
                    >Teams in graph</Label
                  >
                  <Select.Root
                    type="single"
                    value={options.graphTeamCount.toString()}
                    onValueChange={handleGraphTeamCountChange}
                  >
                    <Select.Trigger id="graph-team-count" class="w-full">
                      {options.graphTeamCount} teams
                    </Select.Trigger>
                    <Select.Content>
                      {#each teamCountOptions as count}
                        <Select.Item value={count.toString()}>{count} teams</Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                </div>

                <div class="flex flex-col gap-1.5">
                  <Label for="subtitle" class="text-foreground-l2 text-xs">Subtitle</Label>
                  <Input
                    id="subtitle"
                    bind:value={options.subtitle}
                    placeholder="Optional subtitle"
                    class="h-9"
                  />
                </div>
              </Section.Content>
            </Section.Root>

            <Section.Root>
              <Section.Header>Display</Section.Header>
              <Section.Content class="flex flex-col gap-2">
                <label class="flex cursor-pointer items-center gap-2">
                  <Checkbox bind:checked={options.showHeader} />
                  <span class="text-foreground-l2 text-sm">Show header</span>
                </label>

                <label class="flex cursor-pointer items-center gap-2">
                  <Checkbox bind:checked={options.showGraph} />
                  <span class="text-foreground-l2 text-sm">Show graph</span>
                </label>

                {#if options.showGraph && selfTeam}
                  {@const selfDisabled = !options.showSelf}
                  {#if selfDisabled}
                    <Tooltip.Root>
                      <Tooltip.Trigger
                        class="flex cursor-not-allowed items-center gap-2 pl-4 opacity-50"
                      >
                        <Checkbox checked={false} disabled />
                        <span class="text-foreground-l2 text-sm">Emphasize self only</span>
                      </Tooltip.Trigger>
                      <Tooltip.Content>Requires "Show your team"</Tooltip.Content>
                    </Tooltip.Root>
                  {:else}
                    <label class="flex cursor-pointer items-center gap-2 pl-4">
                      <Checkbox bind:checked={options.emphasizeSelfOnly} />
                      <span class="text-foreground-l2 text-sm">Emphasize self only</span>
                    </label>
                  {/if}
                {/if}

                {#if options.showGraph}
                  {@const canEmphasize = options.graphTeamCount > options.teamCount}
                  {@const isDisabled = options.emphasizeSelfOnly || !canEmphasize}
                  {#if isDisabled}
                    <Tooltip.Root>
                      <Tooltip.Trigger
                        class="flex cursor-not-allowed items-center gap-2 pl-4 opacity-50"
                      >
                        <Checkbox checked={options.emphasizeListedTeams} disabled />
                        <span class="text-foreground-l2 text-sm">Emphasize listed teams</span>
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
                    <label class="flex cursor-pointer items-center gap-2 pl-4">
                      <Checkbox bind:checked={options.emphasizeListedTeams} />
                      <span class="text-foreground-l2 text-sm">Emphasize listed teams</span>
                    </label>
                  {/if}
                {/if}

                <label class="flex cursor-pointer items-center gap-2">
                  <Checkbox bind:checked={options.showAvatars} />
                  <span class="text-foreground-l2 text-sm">Show avatars</span>
                </label>

                <label class="flex cursor-pointer items-center gap-2">
                  <Checkbox bind:checked={options.showFlags} />
                  <span class="text-foreground-l2 text-sm">Show flags</span>
                </label>

                <label class="flex cursor-pointer items-center gap-2">
                  <Checkbox bind:checked={options.showStatuses} />
                  <span class="text-foreground-l2 text-sm">Show statuses</span>
                </label>

                <label class="flex cursor-pointer items-center gap-2">
                  <Checkbox bind:checked={options.showSolveCount} />
                  <span class="text-foreground-l2 text-sm">Show solve count</span>
                </label>

                <label class="flex cursor-pointer items-center gap-2">
                  <Checkbox bind:checked={options.showSparklines} />
                  <span class="text-foreground-l2 text-sm">Show sparklines</span>
                </label>

                <label class="flex cursor-pointer items-center gap-2">
                  <Checkbox bind:checked={options.showMatrix} />
                  <span class="text-foreground-l2 text-sm">Show category matrix</span>
                </label>

                {#if selfTeam}
                  <label class="flex cursor-pointer items-center gap-2">
                    <Checkbox bind:checked={options.showSelf} />
                    <span class="text-foreground-l2 text-sm">Show your team</span>
                  </label>
                {/if}
              </Section.Content>
            </Section.Root>

            <Section.Root>
              <Section.Header>Export</Section.Header>
              <Section.Content class="flex flex-col gap-3">
                <div class="flex flex-col gap-1.5">
                  <Label for="scale" class="text-foreground-l2 text-xs">Resolution</Label>
                  <Select.Root
                    type="single"
                    value={exportSettings.scale.toString()}
                    onValueChange={handleScaleChange}
                  >
                    <Select.Trigger id="scale" class="w-full">
                      {scaleOptions.find(s => s.value === exportSettings.scale)?.label}
                    </Select.Trigger>
                    <Select.Content>
                      {#each scaleOptions as scale}
                        <Select.Item value={scale.value.toString()}>{scale.label}</Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                </div>

                <div class="flex flex-col gap-1.5">
                  <Label for="format" class="text-foreground-l2 text-xs">Format</Label>
                  <Select.Root
                    type="single"
                    value={exportSettings.format}
                    onValueChange={handleFormatChange}
                  >
                    <Select.Trigger id="format" class="w-full">
                      {formatOptions.find(f => f.value === exportSettings.format)?.label}
                    </Select.Trigger>
                    <Select.Content>
                      {#each formatOptions as format}
                        <Select.Item value={format.value}>{format.label}</Select.Item>
                      {/each}
                    </Select.Content>
                  </Select.Root>
                </div>
              </Section.Content>
            </Section.Root>
          </div>
        </ScrollArea>
        <div class="border-t-2 px-4 py-3 md:px-5">
          <Button class="w-full" onclick={handleExport} disabled={isExporting}>
            {#if isExporting}
              <Spinner class="size-4" />
              Exporting...
            {:else}
              <IconDownload class="size-4" />
              Export {exportSettings.format.toUpperCase()}
            {/if}
          </Button>
        </div>
      </div>

      <div class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-b-lg md:rounded-bl-none">
        <div class="min-h-0 flex-1">
          <ScrollArea class="h-full" orientation="both" fadeColor="background-l2">
            <div
              class="checkerboard-bg flex items-center justify-center p-4 md:p-8"
              bind:this={previewRef}
            >
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
                class="shadow-lg"
              />
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  </Dialog.Content>
</Dialog.Root>

<style>
  .checkerboard-bg {
    --checker-size: 12px;
    --checker-color-1: var(--background-l2);
    --checker-color-2: var(--background-l3);
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
</style>

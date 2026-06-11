<script lang="ts">
  import {
    AdminBotJobStatus,
    GetAdminBotConfigRouteV2,
    GetAdminBotJobHistoryRouteV2,
    GetAdminBotJobLogsRouteV2,
    GetAdminBotJobStatusRouteV2,
    ProtectedAction,
    SubmitAdminBotJobRouteV2,
  } from '@rctf/types'
  import { apiRequest, isAuthenticated, showApiError } from '$lib/api'
  import { Button, Field, Input, ScrollArea } from '$lib/components'
  import CaptchaNotice from '$lib/components/captcha-notice.svelte'
  import {
    IconAlertCircleFilled,
    IconChevronDown,
    IconChevronRight,
    IconCircleCheckFilled,
    IconClockFilled,
    IconDownload,
    IconLoader,
    IconLogin,
    IconSend,
  } from '$lib/icons'
  import { useClientConfig } from '$lib/query'
  import { onMount } from 'svelte'
  import { toast } from 'svelte-sonner'

  interface LogEntry {
    time: number
    level: 'info' | 'warn' | 'error' | 'fatal'
    prefix: string
    line: string
    extra: Record<string, unknown>
  }

  interface RegexRule {
    pattern: string
    flags?: string
  }

  interface Props {
    challengeId: string
    inputs: Record<string, RegexRule>
  }

  let { challengeId, inputs }: Props = $props()

  const clientConfigQuery = useClientConfig()
  const clientConfig = $derived(clientConfigQuery.data)
  const inputNames = $derived(Object.keys(inputs))

  let values = $state<Record<string, string>>({})
  let errors = $state<Record<string, string | null>>({})
  let submitting = $state(false)
  let logsOpen = $state(false)
  let expandedLines = $state<Set<number>>(new Set())

  interface HistoryJob {
    id: string
    status: AdminBotJobStatus
    createdAt: string
    hasLogs: boolean
  }
  let history = $state<HistoryJob[]>([])
  let historyOpen = $state(false)
  let historyLogsJobId = $state<string | null>(null)
  let historyLogs = $state<string | null>(null)
  let historyLogsLoading = $state(false)
  let historyExpandedLines = $state<Set<number>>(new Set())

  let job = $state<{
    id: string
    status: AdminBotJobStatus
    createdAt: string
    queuePosition: number | null
    logs: string | null
  } | null>(null)
  let jobLoading = $state(true)
  const isJobActive = $derived(
    job?.status === AdminBotJobStatus.QUEUED || job?.status === AdminBotJobStatus.RUNNING
  )

  function parseLogEntries(logs: string): LogEntry[] {
    return logs
      .split('\n')
      .filter(l => l.trim())
      .map(l => {
        try {
          return JSON.parse(l) as LogEntry
        } catch {
          return null
        }
      })
      .filter((e): e is LogEntry => e !== null)
  }

  const logEntries = $derived(job?.logs ? parseLogEntries(job.logs) : [])
  const historyLogEntries = $derived(historyLogs ? parseLogEntries(historyLogs) : [])

  function hasExtra(entry: LogEntry): boolean {
    return Object.keys(entry.extra).length > 0
  }

  function toggleLine(index: number) {
    if (expandedLines.has(index)) {
      expandedLines.delete(index)
    } else {
      expandedLines.add(index)
    }
    expandedLines = new Set(expandedLines)
  }

  function formatTime(ts: number): string {
    const d = new Date(ts)
    return d.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const levelColors: Record<string, string> = {
    info: 'text-foreground-l3',
    warn: 'text-foreground-l2',
    error: 'text-foreground-destructive',
    fatal: 'text-foreground-destructive',
  }

  function validate(name: string, value: string): string | null {
    if (!value.trim()) return `${name} is required`
    const rule = inputs[name]
    if (!rule) return null
    try {
      const regex = new RegExp(rule.pattern, rule.flags)
      if (!regex.test(value)) return `Does not match the required format (${rule.pattern})`
    } catch {
      // Invalid regex on server side, skip validation
    }
    return null
  }

  function validateAll(): boolean {
    let valid = true
    for (const name of inputNames) {
      const error = validate(name, values[name] ?? '')
      errors[name] = error
      if (error) valid = false
    }
    return valid
  }

  function handleInput(name: string, value: string) {
    values[name] = value
    if (errors[name]) {
      errors[name] = validate(name, value)
    }
  }

  function handleBlur(name: string) {
    errors[name] = validate(name, values[name] ?? '')
  }

  async function fetchJobStatus() {
    try {
      const res = await apiRequest(GetAdminBotJobStatusRouteV2, { id: challengeId })
      if (res.kind === 'goodAdminBotJobStatus') {
        job = res.data.job
      }
    } catch {
    } finally {
      jobLoading = false
    }
    fetchHistory()
  }

  async function submit() {
    if (!validateAll()) return

    submitting = true
    try {
      const res = await apiRequest(SubmitAdminBotJobRouteV2, {
        id: challengeId,
        inputs: Object.fromEntries(inputNames.map(name => [name, values[name] ?? ''])),
      })

      if (res.kind === 'goodAdminBotJobSubmitted') {
        toast.success('Admin bot job submitted!')
        errors = {}
        logsOpen = false
        expandedLines = new Set()
        job = {
          id: res.data.jobId,
          status: AdminBotJobStatus.QUEUED,
          createdAt: new Date().toISOString(),
          queuePosition: null,
          logs: null,
        }
        // Fetch actual queue position from server
        fetchJobStatus()
      } else if (res.kind === 'badAdminBotConfig' || res.kind === 'badInstancerState') {
        toast.error(res.data.error)
      } else {
        showApiError(res)
      }
    } catch {
      toast.error('Network error, please try again')
    } finally {
      submitting = false
    }
  }

  async function downloadConfig() {
    try {
      const res = await apiRequest(GetAdminBotConfigRouteV2, { id: challengeId })
      if (res.kind !== 'goodAdminBotConfig') {
        toast.error(res.message)
        return
      }

      const blob = new Blob([res.data.sourceCode], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `bot${res.data.fileExtension}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Network error, please try again')
    }
  }

  function downloadLogs(raw: string, jobId: string) {
    const blob = new Blob([raw], { type: 'application/jsonl' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `admin-bot-${jobId}.jsonl`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function fetchHistory() {
    const res = await apiRequest(GetAdminBotJobHistoryRouteV2, { id: challengeId })
    if (res.kind === 'goodAdminBotJobHistory') {
      history = (res.data.jobs as HistoryJob[]).filter(h => h.id !== job?.id)
    }
  }

  async function viewHistoryLogs(jobId: string) {
    if (historyLogsJobId === jobId) {
      historyLogsJobId = null
      historyLogs = null
      historyLogsLoading = false
      historyExpandedLines = new Set()
      return
    }

    historyLogsJobId = jobId
    historyLogs = null
    historyLogsLoading = true
    historyExpandedLines = new Set()

    const res = await apiRequest(GetAdminBotJobLogsRouteV2, {
      id: challengeId,
      jobId,
    })
    // a newer click may have switched the selected job while this was in flight
    if (historyLogsJobId !== jobId) {
      return
    }
    if (res.kind === 'goodAdminBotJobLogs') {
      historyLogs = res.data.logs
    }
    historyLogsLoading = false
  }

  function toggleHistoryLine(index: number) {
    if (historyExpandedLines.has(index)) {
      historyExpandedLines.delete(index)
    } else {
      historyExpandedLines.add(index)
    }
    historyExpandedLines = new Set(historyExpandedLines)
  }

  function formatDate(iso: string): string {
    const d = new Date(iso)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }

  onMount(() => {
    fetchJobStatus()
  })

  $effect(() => {
    if (!isJobActive) return
    const poll = setInterval(fetchJobStatus, 3_000)
    return () => clearInterval(poll)
  })
</script>

{#snippet logViewer(
  entries: LogEntry[],
  raw: string,
  jobId: string,
  expanded: Set<number>,
  toggle: (i: number) => void
)}
  <div class="bg-background-l2 mb-3 flex flex-col overflow-hidden rounded-md">
    <ScrollArea viewportClass="max-h-64" fadeColor="background-l2">
      <div class="font-mono text-xs">
        {#each entries as entry, i}
          {@const isExpanded = expanded.has(i)}
          {@const expandable = hasExtra(entry)}
          <button
            type="button"
            class="flex w-full items-start gap-0 text-left transition-colors
              {expandable ? 'hover:bg-background-l3 cursor-pointer' : 'cursor-default'}
              {i > 0 ? 'border-background-l4 border-t' : ''}"
            aria-expanded={expandable ? isExpanded : undefined}
            onclick={() => expandable && toggle(i)}
            disabled={!expandable}
          >
            <span class="text-foreground-l4 flex w-6 shrink-0 items-center justify-center py-1.5">
              {#if expandable}
                <IconChevronRight
                  class="size-3 transition-transform {isExpanded ? 'rotate-90' : ''}"
                />
              {/if}
            </span>
            <span class="text-foreground-l4 shrink-0 py-1.5 pr-2 tabular-nums"
              >{formatTime(entry.time)}</span
            >
            <span
              class="shrink-0 py-1.5 pr-2 font-semibold tracking-wider uppercase {levelColors[
                entry.level
              ] ?? 'text-foreground-l3'}"
              style="font-size: 0.6rem; line-height: 1rem;"
              >{entry.level.charAt(0).toUpperCase()}</span
            >
            <span class="min-w-0 flex-1 py-1.5 pr-3 wrap-anywhere">
              <span class="text-foreground-accent">[{entry.prefix}]</span>
              <span class="whitespace-pre-wrap {levelColors[entry.level] ?? 'text-foreground-l3'}"
                >{entry.line}</span
              >
            </span>
          </button>
          {#if isExpanded}
            <div class="border-background-l4 bg-background-l3 border-t py-1.5 pr-3 pl-8">
              {#each Object.entries(entry.extra) as [key, value]}
                <div class="flex gap-2 py-0.5">
                  <span class="text-foreground-l4 shrink-0">{key}:</span>
                  <span class="text-foreground-l3 break-all"
                    >{typeof value === 'string' ? value : JSON.stringify(value)}</span
                  >
                </div>
              {/each}
            </div>
          {/if}
        {/each}
      </div>
    </ScrollArea>
    <div class="border-background-l4 flex justify-end border-t">
      <button
        type="button"
        class="text-foreground-l4 hover:text-foreground-l2 flex cursor-pointer items-center gap-1 px-3 py-1.5 text-xs transition-colors"
        onclick={() => downloadLogs(raw, jobId)}
      >
        <IconDownload class="size-3.5" />
        Download logs
      </button>
    </div>
  </div>
{/snippet}

{#snippet jobStatusIcon(status: AdminBotJobStatus)}
  {#if status === AdminBotJobStatus.QUEUED}
    <IconClockFilled class="text-foreground-l3 size-3.5 shrink-0" />
  {:else if status === AdminBotJobStatus.RUNNING}
    <IconLoader class="text-foreground-l3 size-3.5 shrink-0 animate-spin" />
  {:else if status === AdminBotJobStatus.COMPLETED}
    <IconCircleCheckFilled class="text-foreground-accent size-3.5 shrink-0" />
  {:else if status === AdminBotJobStatus.FAILED}
    <IconAlertCircleFilled class="text-foreground-destructive size-3.5 shrink-0" />
  {/if}
{/snippet}

<div class="flex h-full flex-col p-3">
  {#if !isAuthenticated()}
    <div class="flex flex-col items-center justify-center space-y-3 text-center">
      <p class="text-foreground-l3 text-sm">Login to use the admin bot.</p>
      <Button href="/login" class="w-full gap-2">
        <IconLogin class="size-4" />
        Login
      </Button>
    </div>
  {:else if jobLoading}
    <div class="flex flex-1 flex-col items-center justify-center">
      <IconLoader class="text-foreground-l4 size-5 animate-spin" />
    </div>
  {:else}
    {#if job}
      <div
        class="mb-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm
        {job.status === AdminBotJobStatus.QUEUED ? 'bg-background-l4 text-foreground-l3' : ''}
        {job.status === AdminBotJobStatus.RUNNING ? 'bg-background-l4 text-foreground-l3' : ''}
        {job.status === AdminBotJobStatus.COMPLETED
          ? 'bg-background-l4 text-foreground-accent'
          : ''}
        {job.status === AdminBotJobStatus.FAILED
          ? 'bg-background-l4 text-foreground-destructive'
          : ''}
      "
      >
        {#if job.status === AdminBotJobStatus.QUEUED}
          <IconClockFilled class="size-4 shrink-0" />
          <span>Job queued{job.queuePosition ? ` (position ${job.queuePosition})` : ''}</span>
        {:else if job.status === AdminBotJobStatus.RUNNING}
          <IconLoader class="size-4 shrink-0 animate-spin" />
          <span>Job running</span>
        {:else if job.status === AdminBotJobStatus.COMPLETED}
          <IconCircleCheckFilled class="size-4 shrink-0" />
          <span>Job completed</span>
        {:else if job.status === AdminBotJobStatus.FAILED}
          <IconAlertCircleFilled class="size-4 shrink-0" />
          <span>Job failed</span>
        {/if}

        {#if job.logs}
          <button
            type="button"
            class="ml-auto flex items-center gap-1 text-xs opacity-60 transition-opacity hover:opacity-100"
            onclick={() => (logsOpen = !logsOpen)}
          >
            Logs
            <IconChevronDown class="size-3.5 transition-transform {logsOpen ? 'rotate-180' : ''}" />
          </button>
        {/if}
      </div>

      {#if job.logs && logsOpen}
        {@render logViewer(logEntries, job.logs, job.id, expandedLines, toggleLine)}
      {/if}
    {/if}

    {#if history.length > 0}
      <button
        type="button"
        class="text-foreground-l4 hover:text-foreground-l3 mb-3 flex w-full items-center gap-2 text-xs transition-colors"
        aria-expanded={historyOpen}
        onclick={() => (historyOpen = !historyOpen)}
      >
        <IconChevronRight class="size-3.5 transition-transform {historyOpen ? 'rotate-90' : ''}" />
        <span>Previous jobs ({history.length})</span>
      </button>

      {#if historyOpen}
        <div class="mb-3 space-y-1">
          {#each history as historyJob}
            <div>
              <button
                type="button"
                class="bg-background-l4 hover:bg-background-l3 flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors"
                aria-expanded={historyLogsJobId === historyJob.id}
                onclick={() => historyJob.hasLogs && viewHistoryLogs(historyJob.id)}
                disabled={!historyJob.hasLogs}
              >
                {@render jobStatusIcon(historyJob.status)}
                <span class="text-foreground-l3 tabular-nums"
                  >{formatDate(historyJob.createdAt)}</span
                >
                <span class="text-foreground-l4 capitalize">{historyJob.status}</span>
                {#if historyJob.hasLogs}
                  <span
                    class="ml-auto flex items-center gap-1 opacity-60 transition-opacity hover:opacity-100"
                  >
                    Logs
                    <IconChevronDown
                      class="size-3 transition-transform {historyLogsJobId === historyJob.id
                        ? 'rotate-180'
                        : ''}"
                    />
                  </span>
                {/if}
              </button>

              {#if historyLogsJobId === historyJob.id}
                {#if historyLogsLoading}
                  <div class="flex justify-center py-3">
                    <IconLoader class="text-foreground-l4 size-4 animate-spin" />
                  </div>
                {:else if historyLogs}
                  {@render logViewer(
                    historyLogEntries,
                    historyLogs,
                    historyJob.id,
                    historyExpandedLines,
                    toggleHistoryLine
                  )}
                {/if}
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    {/if}

    <form
      class="flex flex-1 flex-col gap-3"
      onsubmit={e => {
        e.preventDefault()
        submit()
      }}
    >
      {#each inputNames as name}
        <Field.Field data-invalid={errors[name] ? true : undefined}>
          <Field.Label>{name}</Field.Label>
          <Input
            id="adminbot-{name}"
            type="text"
            placeholder={inputs[name]?.pattern ?? name}
            class="font-mono text-sm"
            value={values[name] ?? ''}
            oninput={e => handleInput(name, e.currentTarget.value)}
            onblur={() => handleBlur(name)}
            aria-invalid={!!errors[name]}
            disabled={submitting || isJobActive}
          />
          {#if errors[name]}
            <Field.Error>{errors[name]}</Field.Error>
          {/if}
        </Field.Field>
      {/each}

      <div class="mt-auto flex flex-col gap-2">
        <Button type="submit" disabled={submitting || isJobActive} class="w-full">
          {#if submitting}
            <IconLoader class="size-4 animate-spin" />
          {:else}
            <IconSend class="size-4" />
          {/if}
          Submit
        </Button>
        <Button type="button" variant="secondary" class="w-full" onclick={downloadConfig}>
          <IconDownload class="size-4" />
          Download config
        </Button>
        <CaptchaNotice config={clientConfig} action={ProtectedAction.AdminBotSubmit} />
      </div>
    </form>
  {/if}
</div>

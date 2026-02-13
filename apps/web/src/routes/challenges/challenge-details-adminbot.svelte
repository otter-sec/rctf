<script lang="ts">
  import {
    AdminBotJobStatus,
    GetAdminBotConfigRouteV2,
    GetAdminBotJobStatusRouteV2,
    SubmitAdminBotJobRouteV2,
  } from '@rctf/types'
  import { onMount } from 'svelte'
  import { apiRequest, isAuthenticated, showApiError } from '$lib/api'
  import { Button, Input, ScrollArea } from '$lib/components'
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
  import { toast } from 'svelte-sonner'

  interface LogEntry {
    time: number
    level: 'info' | 'warn' | 'error' | 'fatal'
    prefix: string
    line: string
    extra: Record<string, unknown>
  }

  interface Props {
    challengeId: string
    inputs: Record<string, string>
  }

  let { challengeId, inputs }: Props = $props()

  const inputNames = $derived(Object.keys(inputs))

  let values = $state<Record<string, string>>({})
  let errors = $state<Record<string, string | null>>({})
  let submitting = $state(false)
  let logsOpen = $state(false)
  let expandedLines = $state<Set<number>>(new Set())

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
    warn: 'text-yellow-400',
    error: 'text-foreground-destructive',
    fatal: 'text-foreground-destructive',
  }

  function validate(name: string, value: string): string | null {
    if (!value.trim()) return `${name} is required`
    const pattern = inputs[name]
    if (!pattern) return null
    try {
      const regex = new RegExp(pattern)
      if (!regex.test(value)) return `Does not match the required format (${pattern})`
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
    const res = await apiRequest(GetAdminBotJobStatusRouteV2, { id: challengeId })
    if (res.kind === 'goodAdminBotJobStatus') {
      job = res.data.job
    }
    jobLoading = false
  }

  async function submit() {
    if (!validateAll()) return

    submitting = true
    const res = await apiRequest(SubmitAdminBotJobRouteV2, {
      id: challengeId,
      inputs: Object.fromEntries(inputNames.map(name => [name, values[name] ?? ''])),
    })

    if (res.kind === 'goodAdminBotJobSubmitted') {
      toast.success('Admin bot job submitted!')
      values = {}
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
    } else if (res.kind === 'badAdminBotConfig') {
      toast.error(res.data.error)
    } else {
      showApiError(res)
    }
    submitting = false
  }

  async function downloadConfig() {
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
        <ScrollArea
          class="bg-background-l2 mb-3 max-h-64 rounded-md"
          orientation="both"
          fadeColor="background-l2"
        >
          <div class="w-max min-w-full font-mono text-xs">
            {#each logEntries as entry, i}
              {@const expanded = expandedLines.has(i)}
              {@const expandable = hasExtra(entry)}
              <button
                type="button"
                class="flex w-full items-start gap-0 text-left transition-colors
                  {expandable ? 'cursor-pointer hover:bg-white/[0.03]' : 'cursor-default'}
                  {i > 0 ? 'border-t border-white/[0.04]' : ''}"
                onclick={() => expandable && toggleLine(i)}
                disabled={!expandable}
              >
                <span
                  class="text-foreground-l4 flex w-6 shrink-0 items-center justify-center pt-1.5"
                >
                  {#if expandable}
                    <IconChevronRight
                      class="size-3 transition-transform {expanded ? 'rotate-90' : ''}"
                    />
                  {/if}
                </span>
                <span class="text-foreground-l4 shrink-0 pt-1.5 pr-2 tabular-nums"
                  >{formatTime(entry.time)}</span
                >
                <span
                  class="shrink-0 pt-1.5 pr-2 font-semibold tracking-wider uppercase {levelColors[
                    entry.level
                  ] ?? 'text-foreground-l3'}"
                  style="font-size: 0.6rem;"
                  >{entry.level === 'info'
                    ? 'I'
                    : entry.level === 'warn'
                      ? 'W'
                      : entry.level === 'error'
                        ? 'E'
                        : 'F'}</span
                >
                <span class="flex-1 py-1.5 pr-3">
                  <span class="text-foreground-accent">[{entry.prefix}]</span>
                  <span class={levelColors[entry.level] ?? 'text-foreground-l3'}>{entry.line}</span>
                </span>
              </button>
              {#if expanded}
                <div class="border-t border-white/[0.04] bg-white/[0.02] py-1.5 pr-3 pl-8">
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
        <div class="space-y-1">
          <label for="adminbot-{name}" class="text-foreground-l3 text-sm">{name}</label>
          <Input
            id="adminbot-{name}"
            type="text"
            placeholder={inputs[name] ?? name}
            class="font-mono text-sm"
            value={values[name] ?? ''}
            oninput={e => handleInput(name, e.currentTarget.value)}
            onblur={() => handleBlur(name)}
            aria-invalid={!!errors[name]}
            disabled={submitting || isJobActive}
          />
          {#if errors[name]}
            <p class="text-foreground-destructive text-xs">{errors[name]}</p>
          {/if}
        </div>
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
      </div>
    </form>
  {/if}
</div>

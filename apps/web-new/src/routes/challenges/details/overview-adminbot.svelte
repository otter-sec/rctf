<script lang="ts">
  import {
    AdminBotJobStatus,
    BadAdminBotConfig,
    BadInstancerState,
    GetAdminBotConfigRouteV2,
    GetAdminBotJobLogsRouteV2,
    GoodAdminBotConfig,
    GoodAdminBotJobLogs,
    GoodAdminBotJobSubmitted,
    ProtectedAction,
    SubmitAdminBotJobRouteV2,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { apiRequest, showApiError } from '$lib/api'
  import CaptchaNotice from '$lib/components/captcha-notice.svelte'
  import {
    IconAlertCircleFilled,
    IconChevronDown,
    IconChevronRight,
    IconCircleCheckFilled,
    IconClockFilled,
    IconDownload,
    IconLogin,
    IconSend,
  } from '$lib/icons'
  import { useAdminBotHistory, useAdminBotStatus } from '$lib/query/challenges'
  import { useClientConfig } from '$lib/query/config'
  import { queryKeys } from '$lib/query/keys'
  import { useCurrentUser } from '$lib/query/user'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import Field from '$lib/ui/field.svelte'
  import Input from '$lib/ui/input.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { parseAdminBotLogs, validateAdminBotInput } from '$lib/utils/admin-bot-logs'
  import { downloadTextFile } from '$lib/utils/download'
  import { formatLocalTime } from '$lib/utils/time'
  import AdminBotLogViewer from './adminbot-log-viewer.svelte'

  interface Props {
    challengeId: string
    inputs: Record<string, { pattern: string; flags?: string }>
  }

  let { challengeId, inputs }: Props = $props()

  const configQuery = useClientConfig()
  const clientConfig = $derived(configQuery.data)

  const userQuery = useCurrentUser()
  const isAuthenticated = $derived(userQuery.data != null)

  const queryClient = useQueryClient()
  const statusKey = $derived(queryKeys.challengeAdminBotStatus(challengeId))

  const statusQuery = useAdminBotStatus(
    () => challengeId,
    () => isAuthenticated
  )
  const historyQuery = useAdminBotHistory(
    () => challengeId,
    () => isAuthenticated
  )

  const job = $derived(statusQuery.data ?? null)
  const isJobActive = $derived(
    job?.status === AdminBotJobStatus.QUEUED || job?.status === AdminBotJobStatus.RUNNING
  )
  const logEntries = $derived(job?.logs ? parseAdminBotLogs(job.logs) : [])

  const history = $derived((historyQuery.data ?? []).filter(entry => entry.id !== job?.id))

  const inputNames = $derived(Object.keys(inputs))

  const view = $derived(!isAuthenticated ? 'login' : statusQuery.isLoading ? 'loading' : 'ready')

  let values = $state<Record<string, string>>({})
  let errors = $state<Record<string, string | undefined>>({})
  let submitting = $state(false)
  let logsOpen = $state(false)
  let historyOpen = $state(false)

  let openHistoryLogsJobId = $state<string | null>(null)
  let historyLogs = $state<string | null>(null)
  let historyLogsLoading = $state(false)
  let historyLogsRequestId = 0
  const historyLogEntries = $derived(historyLogs ? parseAdminBotLogs(historyLogs) : [])

  const statusUpdatedAt = $derived(statusQuery.dataUpdatedAt)
  $effect(() => {
    void statusUpdatedAt
    if (!isAuthenticated) return
    void queryClient.invalidateQueries({
      queryKey: queryKeys.challengeAdminBotHistory(challengeId),
      exact: true,
    })
  })

  function validateField(name: string): string | undefined {
    const rule = inputs[name]
    if (!rule) return undefined
    return validateAdminBotInput(values[name] ?? '', rule).error
  }

  function validateAll(): boolean {
    let valid = true
    for (const name of inputNames) {
      const error = validateField(name)
      errors[name] = error
      if (error) valid = false
    }
    return valid
  }

  function revalidateIfShown(name: string) {
    if (errors[name]) {
      errors[name] = validateField(name)
    }
  }

  function handleBlur(name: string) {
    errors[name] = validateField(name)
  }

  async function submit() {
    if (!validateAll()) return
    submitting = true
    try {
      const res = await apiRequest(SubmitAdminBotJobRouteV2, {
        id: challengeId,
        inputs: Object.fromEntries(inputNames.map(name => [name, values[name] ?? ''])),
      })
      if (res.kind === GoodAdminBotJobSubmitted.kind) {
        toast.success('Admin bot job submitted!')
        errors = {}
        logsOpen = false
        queryClient.setQueryData(statusKey, {
          id: res.data.jobId,
          status: AdminBotJobStatus.QUEUED,
          createdAt: new Date().toISOString(),
          queuePosition: null,
          logs: null,
        })
        void queryClient.invalidateQueries({ queryKey: statusKey, exact: true })
      } else if (res.kind === BadAdminBotConfig.kind || res.kind === BadInstancerState.kind) {
        toast.error(res.data.error)
      } else {
        showApiError(res)
      }
    } finally {
      submitting = false
    }
  }

  async function downloadConfig() {
    const res = await apiRequest(GetAdminBotConfigRouteV2, { id: challengeId })
    if (res.kind === GoodAdminBotConfig.kind) {
      downloadTextFile(`bot${res.data.fileExtension}`, res.data.sourceCode, 'text/plain')
    } else {
      showApiError(res)
    }
  }

  async function viewHistoryLogs(jobId: string) {
    if (openHistoryLogsJobId === jobId) {
      openHistoryLogsJobId = null
      historyLogs = null
      historyLogsLoading = false
      return
    }
    const requestId = ++historyLogsRequestId
    openHistoryLogsJobId = jobId
    historyLogs = null
    historyLogsLoading = true
    const res = await apiRequest(GetAdminBotJobLogsRouteV2, {
      id: challengeId,
      jobId,
    })
    if (requestId !== historyLogsRequestId) return
    if (res.kind === GoodAdminBotJobLogs.kind) {
      historyLogs = res.data.logs
    } else {
      showApiError(res)
    }
    historyLogsLoading = false
  }
</script>

{#snippet statusIcon(status: AdminBotJobStatus)}
  <status-icon data-status={status}>
    {#if status === AdminBotJobStatus.QUEUED}
      <IconClockFilled />
    {:else if status === AdminBotJobStatus.RUNNING}
      <Spinner />
    {:else if status === AdminBotJobStatus.COMPLETED}
      <IconCircleCheckFilled />
    {:else if status === AdminBotJobStatus.FAILED}
      <IconAlertCircleFilled />
    {/if}
  </status-icon>
{/snippet}

<adminbot-panel data-view={view}>
  {#if view === 'login'}
    <adminbot-empty>
      <adminbot-message>Login to use the admin bot.</adminbot-message>
      <Button href="/login">
        <IconLogin />
        Login
      </Button>
    </adminbot-empty>
  {:else if view === 'loading'}
    <adminbot-loading><Spinner /></adminbot-loading>
  {:else}
    {#if job}
      <job-card data-status={job.status}>
        <job-status>
          {@render statusIcon(job.status)}
          {#if job.status === AdminBotJobStatus.QUEUED}
            <span
              >Job queued{job.queuePosition != null ? ` (position ${job.queuePosition})` : ''}</span
            >
          {:else if job.status === AdminBotJobStatus.RUNNING}
            <span>Job running</span>
          {:else if job.status === AdminBotJobStatus.COMPLETED}
            <span>Job completed</span>
          {:else if job.status === AdminBotJobStatus.FAILED}
            <span>Job failed</span>
          {/if}
        </job-status>
        {#if job.logs}
          <button
            type="button"
            data-slot="logs-toggle"
            aria-expanded={logsOpen}
            onclick={() => (logsOpen = !logsOpen)}
          >
            Logs
            <IconChevronDown data-open={logsOpen || undefined} />
          </button>
        {/if}
      </job-card>

      {#if job.logs && logsOpen}
        <AdminBotLogViewer entries={logEntries} raw={job.logs} jobId={job.id} />
      {/if}
    {/if}

    {#if history.length > 0}
      <button
        type="button"
        data-slot="history-toggle"
        aria-expanded={historyOpen}
        onclick={() => (historyOpen = !historyOpen)}
      >
        <IconChevronRight data-open={historyOpen || undefined} />
        <span>Previous jobs ({history.length})</span>
      </button>

      {#if historyOpen}
        <history-list>
          {#each history as historyJob (historyJob.id)}
            <history-item>
              <button
                type="button"
                aria-expanded={openHistoryLogsJobId === historyJob.id}
                disabled={!historyJob.hasLogs}
                onclick={() => historyJob.hasLogs && viewHistoryLogs(historyJob.id)}
              >
                {@render statusIcon(historyJob.status)}
                <history-date>{formatLocalTime(Date.parse(historyJob.createdAt))}</history-date>
                <history-status>{historyJob.status}</history-status>
                {#if historyJob.hasLogs}
                  <history-logs-hint>
                    Logs
                    <IconChevronDown
                      data-open={openHistoryLogsJobId === historyJob.id || undefined}
                    />
                  </history-logs-hint>
                {/if}
              </button>

              {#if openHistoryLogsJobId === historyJob.id}
                {#if historyLogsLoading}
                  <history-logs-loading><Spinner /></history-logs-loading>
                {:else if historyLogs}
                  <AdminBotLogViewer
                    entries={historyLogEntries}
                    raw={historyLogs}
                    jobId={historyJob.id}
                  />
                {/if}
              {/if}
            </history-item>
          {/each}
        </history-list>
      {/if}
    {/if}

    <form
      onsubmit={event => {
        event.preventDefault()
        void submit()
      }}
    >
      {#each inputNames as name (name)}
        <Field label={name} error={errors[name]}>
          {#snippet children({ id, describedBy })}
            <Input
              {id}
              type="text"
              data-mono
              placeholder={inputs[name]?.pattern ?? name}
              aria-describedby={describedBy}
              aria-invalid={errors[name] ? true : undefined}
              disabled={submitting || isJobActive}
              bind:value={values[name]}
              oninput={() => revalidateIfShown(name)}
              onblur={() => handleBlur(name)}
            />
          {/snippet}
        </Field>
      {/each}

      <form-actions>
        <Button type="submit" disabled={submitting || isJobActive}>
          {#if submitting}<Spinner />{:else}<IconSend />{/if}
          Submit
        </Button>
        <Button type="button" variant="secondary" onclick={downloadConfig}>
          <IconDownload />
          Download config
        </Button>
        <CaptchaNotice config={clientConfig} action={ProtectedAction.AdminBotSubmit} />
      </form-actions>
    </form>
  {/if}
</adminbot-panel>

<style>
  adminbot-panel {
    display: flex;
    flex-direction: column;
    gap: var(--space-s);
    block-size: 100%;
  }

  adminbot-empty {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-s);

    :global(a[data-variant]) {
      inline-size: 100%;
    }
  }

  adminbot-message {
    color: var(--foreground-l3);
    font-size: var(--step--1);
    text-align: center;
    text-wrap: balance;
  }

  adminbot-loading {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    color: var(--foreground-l4);
    font-size: 1.25rem;
  }

  status-icon {
    display: inline-flex;
    flex-shrink: 0;
    color: var(--foreground-l3);

    &[data-status='completed'] {
      color: var(--foreground-success);
    }

    &[data-status='failed'] {
      color: var(--foreground-destructive);
    }
  }

  job-card {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    padding: var(--space-2xs) var(--space-s);
    background: var(--background-l2);
    border: 2px solid var(--border);
    border-radius: var(--radius-md);

    &[data-status='completed'] job-status {
      color: var(--foreground-success);
    }

    &[data-status='failed'] job-status {
      color: var(--foreground-destructive);
    }
  }

  job-status {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    color: var(--foreground-l3);
  }

  [data-slot='logs-toggle'] {
    display: inline-flex;
    align-items: center;
    gap: var(--space-3xs);
    margin-inline-start: auto;
    color: var(--foreground-l3);
    font-size: var(--step--1);
    cursor: pointer;

    &:hover {
      color: var(--foreground-l1);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
      border-radius: var(--radius-sm);
    }

    :global(svg) {
      inline-size: 1em;
      block-size: 1em;
      transition: rotate 0.15s ease;
    }

    :global(svg[data-open]) {
      rotate: 180deg;
    }
  }

  [data-slot='history-toggle'] {
    display: flex;
    align-items: center;
    gap: var(--space-3xs);
    color: var(--foreground-l3);
    font-size: var(--step--1);
    cursor: pointer;

    &:hover {
      color: var(--foreground-l1);
    }

    &:focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
      border-radius: var(--radius-sm);
    }

    :global(svg) {
      inline-size: 1em;
      block-size: 1em;
      transition: rotate 0.15s ease;
    }

    :global(svg[data-open]) {
      rotate: 90deg;
    }
  }

  history-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
  }

  history-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);

    > button {
      display: flex;
      align-items: center;
      gap: var(--space-2xs);
      inline-size: 100%;
      padding: var(--space-2xs) var(--space-s);
      color: inherit;
      text-align: start;
      background: var(--background-l2);
      border: 2px solid var(--border);
      border-radius: var(--radius-md);
      font-size: var(--step--1);
      cursor: pointer;

      &:hover:not(:disabled) {
        background: var(--background-l3);
      }

      &:disabled {
        cursor: default;
      }

      &:focus-visible {
        outline: 2px solid var(--ring);
        outline-offset: 2px;
      }
    }
  }

  history-date {
    color: var(--foreground-l1);
    font-variant-numeric: tabular-nums;
  }

  history-status {
    color: var(--foreground-l3);
    text-transform: capitalize;
  }

  history-logs-hint {
    display: inline-flex;
    align-items: center;
    gap: var(--space-3xs);
    margin-inline-start: auto;
    color: var(--foreground-l3);

    :global(svg) {
      inline-size: 1em;
      block-size: 1em;
      transition: rotate 0.15s ease;
    }

    :global(svg[data-open]) {
      rotate: 180deg;
    }
  }

  history-logs-loading {
    display: flex;
    justify-content: center;
    padding: var(--space-s);
    color: var(--foreground-l4);
  }

  form {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-s);

    :global(input[data-mono]) {
      font-family: var(--font-mono);
      font-size: var(--step--1);
    }
  }

  form-actions {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    margin-block-start: auto;

    :global(button[data-variant]) {
      inline-size: 100%;
    }
  }
</style>

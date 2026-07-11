<script lang="ts">
  import {
    BadAlreadySolvedChallenge,
    BadInstancerError,
    CreateInstanceRouteV2,
    DeleteInstanceRouteV2,
    ExtendInstanceRouteV2,
    GoodFlag,
    GoodInstancerActionResult,
    GoodInstanceStatus,
    InstanceStatus,
    ProtectedAction,
    RunInstanceActionRouteV2,
    SubmitFlagRoute,
  } from '@rctf/types'
  import { useQueryClient } from '@tanstack/svelte-query'
  import { apiRequest, showApiError } from '$lib/api'
  import CaptchaNotice from '$lib/components/captcha-notice.svelte'
  import { IconCopy, IconSignIn } from '$lib/icons'
  import { useChallengeInstance } from '$lib/query/challenges'
  import { useClientConfig } from '$lib/query/config'
  import { queryKeys } from '$lib/query/keys'
  import { useCurrentUser } from '$lib/query/user'
  import { toast } from '$lib/toast'
  import Button from '$lib/ui/button.svelte'
  import Progress from '$lib/ui/progress.svelte'
  import Spinner from '$lib/ui/spinner.svelte'
  import { copyText } from '$lib/utils/clipboard'
  import { formatEndpoint } from '$lib/utils/instancer'
  import { formatCountdown } from '$lib/utils/time'

  interface Props {
    challengeId: string
    instancerLifetime: number
    instancerExtendable: boolean
    instancerStoppable: boolean
    instancerActions: { id: string; label: string }[]
    onSolve: (challengeId: string) => void
  }

  let {
    challengeId,
    instancerLifetime,
    instancerExtendable,
    instancerStoppable,
    instancerActions,
    onSolve,
  }: Props = $props()

  const configQuery = useClientConfig()
  const clientConfig = $derived(configQuery.data)
  const isArchived = $derived(clientConfig?.isArchived ?? false)

  const userQuery = useCurrentUser()
  const isAuthenticated = $derived(userQuery.data != null)

  const queryClient = useQueryClient()
  const instanceEnabled = $derived(isAuthenticated && !isArchived)
  const instanceQuery = useChallengeInstance(
    () => challengeId,
    () => instanceEnabled
  )

  const status = $derived(instanceQuery.data?.status ?? InstanceStatus.STOPPED)
  const endpoints = $derived(instanceQuery.data?.endpoints ?? [])
  const formattedEndpoints = $derived(
    endpoints.map((endpoint, index) => formatEndpoint(endpoint, index, endpoints.length))
  )

  const transitioning = $derived(
    status === InstanceStatus.STARTING || status === InstanceStatus.STOPPING
  )

  type PanelView = 'archived' | 'login' | 'loading' | 'error' | 'stopped' | 'running'

  const view = $derived.by((): PanelView => {
    if (isArchived) return 'archived'
    if (!isAuthenticated) return 'login'
    if (instanceQuery.isLoading) return 'loading'
    if (instanceQuery.isError) return 'error'
    if (status === InstanceStatus.STOPPED) return 'stopped'
    return 'running'
  })

  let pendingAction = $state<string | null>(null)
  const pending = $derived(pendingAction !== null)
  const actionsDisabled = $derived(pending || status === InstanceStatus.STOPPING)

  const instanceKey = $derived(queryKeys.challengeInstance(challengeId))

  let timeLeft = $derived(instanceQuery.data?.timeLeftMilliseconds ?? null)
  $effect(() => {
    if (status !== InstanceStatus.RUNNING && status !== InstanceStatus.STARTING) {
      return
    }
    const tick = setInterval(() => {
      if (timeLeft !== null && timeLeft > 0) {
        timeLeft = Math.max(0, timeLeft - 1000)
      }
    }, 1000)
    return () => clearInterval(tick)
  })

  async function start() {
    pendingAction = 'start'
    try {
      const res = await apiRequest(CreateInstanceRouteV2, { id: challengeId })
      if (res.kind === GoodInstanceStatus.kind) {
        queryClient.setQueryData(instanceKey, res.data)
        void queryClient.invalidateQueries({ queryKey: instanceKey })
        toast.success('Instance started')
      } else {
        showApiError(res)
      }
    } finally {
      pendingAction = null
    }
  }

  async function stop() {
    pendingAction = 'stop'
    try {
      const res = await apiRequest(DeleteInstanceRouteV2, { id: challengeId })
      if (res.kind === GoodInstanceStatus.kind) {
        queryClient.setQueryData(instanceKey, res.data)
        void queryClient.invalidateQueries({ queryKey: instanceKey })
        toast.success('Instance stopped')
      } else {
        showApiError(res)
      }
    } finally {
      pendingAction = null
    }
  }

  async function extend() {
    pendingAction = 'extend'
    try {
      const res = await apiRequest(ExtendInstanceRouteV2, { id: challengeId })
      if (res.kind === GoodInstanceStatus.kind) {
        queryClient.setQueryData(instanceKey, res.data)
        void queryClient.invalidateQueries({ queryKey: instanceKey })
        toast.success('Instance extended')
      } else {
        showApiError(res)
      }
    } finally {
      pendingAction = null
    }
  }

  async function submitResolvedFlag(flag: string) {
    toast.info(flag, { duration: 15_000 })
    const res = await apiRequest(SubmitFlagRoute, { id: challengeId, flag })
    if (res.kind === GoodFlag.kind) {
      toast.success('Flag correct!')
      onSolve(challengeId)
    } else if (res.kind === BadAlreadySolvedChallenge.kind) {
      toast.info('You already solved this challenge')
      onSolve(challengeId)
    } else {
      showApiError(res)
    }
  }

  async function runAction(actionId: string) {
    pendingAction = actionId
    try {
      const res = await apiRequest(RunInstanceActionRouteV2, {
        id: challengeId,
        action: actionId,
      })
      if (res.kind === GoodInstancerActionResult.kind) {
        if (res.data.message) {
          toast.success(res.data.message)
        }
        if (res.data.submitFlag) {
          await submitResolvedFlag(res.data.submitFlag)
        }
        void queryClient.invalidateQueries({ queryKey: instanceKey })
      } else if (res.kind === BadInstancerError.kind) {
        toast.error(res.data.message)
      } else {
        showApiError(res)
      }
    } finally {
      pendingAction = null
    }
  }

  const hasActionRow = $derived(
    instancerActions.length > 0 || instancerExtendable || instancerStoppable
  )
</script>

<instancer-panel data-view={view}>
  {#if view === 'archived'}
    <instancer-message>Instancer is not available in archived mode.</instancer-message>
  {:else if view === 'login'}
    <instancer-empty>
      <instancer-message>Login to use the instancer.</instancer-message>
      <Button href="/login">
        <IconSignIn />
        Login
      </Button>
    </instancer-empty>
  {:else if view === 'loading'}
    <instancer-loading><Spinner /></instancer-loading>
  {:else if view === 'error'}
    <instancer-empty>
      <instancer-message data-tone="error">
        {instanceQuery.error?.message ?? 'Failed to load instance status.'}
      </instancer-message>
      <Button size="sm" onclick={() => instanceQuery.refetch()}>Retry</Button>
    </instancer-empty>
  {:else if view === 'stopped'}
    <instancer-empty>
      <instancer-message>No instance running.</instancer-message>
      <Button onclick={start} disabled={pending}>
        {#if pendingAction === 'start'}<Spinner />{/if}
        Start instance
      </Button>
      <CaptchaNotice config={clientConfig} action={ProtectedAction.InstancerStart} />
    </instancer-empty>
  {:else}
    <instancer-running>
      {#if status === InstanceStatus.STARTING}
        <instancer-status><Spinner /><span>Starting…</span></instancer-status>
      {:else if status === InstanceStatus.STOPPING}
        <instancer-status><Spinner /><span>Stopping…</span></instancer-status>
      {:else if status === InstanceStatus.ERRORED}
        <instancer-status data-tone="error"><span>Errored</span></instancer-status>
      {/if}

      {#each formattedEndpoints as endpoint, index (index)}
        <instancer-endpoint data-dimmed={transitioning || undefined}>
          <endpoint-head>
            <span>{endpoint.label}</span>
            {#if endpoint.protocolTag}<span>{endpoint.protocolTag}</span>{/if}
          </endpoint-head>
          <endpoint-value>
            <code>{endpoint.value}</code>
            {#if !transitioning}
              <button
                type="button"
                aria-label="Copy {endpoint.label}"
                onclick={() =>
                  copyText(endpoint.copyValue, 'Copied to clipboard', 'Failed to copy')}
              >
                <IconCopy />
              </button>
            {/if}
          </endpoint-value>
        </instancer-endpoint>
      {/each}

      {#if timeLeft !== null}
        <instancer-countdown>
          <Progress value={timeLeft} max={instancerLifetime} />
          <span>{formatCountdown(timeLeft)} remaining</span>
        </instancer-countdown>
      {/if}

      {#if hasActionRow}
        <instancer-actions>
          {#each instancerActions as action (action.id)}
            <Button
              variant="secondary"
              onclick={() => runAction(action.id)}
              disabled={actionsDisabled}
            >
              {#if pendingAction === action.id}<Spinner />{/if}
              {action.label}
            </Button>
          {/each}
          {#if instancerExtendable}
            <Button variant="secondary" onclick={extend} disabled={actionsDisabled}>
              {#if pendingAction === 'extend'}<Spinner />{/if}
              Extend
            </Button>
          {/if}
          {#if instancerStoppable}
            <Button variant="destructive" onclick={stop} disabled={actionsDisabled}>
              {#if pendingAction === 'stop'}<Spinner />{/if}
              Stop
            </Button>
          {/if}
        </instancer-actions>
      {/if}

      <CaptchaNotice config={clientConfig} action={ProtectedAction.InstancerExtend} />
    </instancer-running>
  {/if}
</instancer-panel>

<style>
  instancer-panel {
    display: flex;
    flex-direction: column;
    block-size: 100%;
  }

  instancer-message {
    color: var(--foreground-l3);
    font-size: var(--step--1);
    text-align: center;
    text-wrap: balance;

    &[data-tone='error'] {
      color: var(--foreground-destructive);
    }
  }

  instancer-empty {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;

    :global(a[data-variant]),
    :global(button[data-variant]) {
      inline-size: 100%;
    }
  }

  instancer-loading {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    color: var(--foreground-l4);
    font-size: 1.25rem;
  }

  instancer-running {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: var(--space-s);
  }

  instancer-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2xs);
    color: var(--foreground-l3);
    font-size: var(--step--1);

    &[data-tone='error'] {
      color: var(--foreground-destructive);
    }
  }

  instancer-endpoint {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);

    &[data-dimmed] {
      opacity: 0.5;

      endpoint-value code {
        color: var(--foreground-l4);
      }
    }
  }

  endpoint-head {
    display: flex;
    justify-content: space-between;
    color: var(--foreground-l3);
    font-size: var(--step--1);
  }

  endpoint-value {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2xs);
    padding: var(--space-2xs) var(--space-s);
    background: var(--background-l4);
    border-radius: var(--radius-md);

    code {
      overflow: hidden;
      color: var(--foreground-accent);
      font-family: var(--font-mono);
      font-size: var(--step--1);
      white-space: nowrap;
      text-overflow: ellipsis;
    }

    button {
      display: inline-flex;
      flex-shrink: 0;
      color: var(--foreground-l4);
      cursor: pointer;

      &:hover {
        color: var(--foreground-l2);
      }

      &:focus-visible {
        outline: 2px solid var(--ring);
      }

      :global(svg) {
        inline-size: 1rem;
        block-size: 1rem;
      }
    }
  }

  instancer-countdown {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
    margin-block-start: auto;
    --progress-height: var(--space-3xs);

    span {
      color: var(--foreground-l3);
      font-size: var(--step--1);
      text-align: center;
    }
  }

  instancer-actions {
    display: flex;
    gap: var(--space-2xs);

    :global(button[data-variant]) {
      flex: 1;
    }
  }
</style>

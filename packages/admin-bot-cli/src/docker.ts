import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createInterface } from 'node:readline'
import type {
  LocalInspection,
  LocalRunResult,
  LocalRunnerEvent,
  LocalRunnerRequest,
} from '../../../apps/admin-bot/src/local-protocol'
import { decodeLocalRunnerEvent } from '../../../apps/admin-bot/src/local-protocol'
import {
  dockerDisplayConnectionError,
  prepareDockerDisplay,
} from './docker-display'
import { runCommand } from './command'
import { loadCliState, updateCliState } from './state'
import packageJson from '../package.json' with { type: 'json' }

const ADMIN_BOT_IMAGE = 'ghcr.io/otter-sec/rctf/admin-bot'
export const adminBotImageForVersion = (version: string): string =>
  `${ADMIN_BOT_IMAGE}:v${version}`

const DEFAULT_IMAGE = adminBotImageForVersion(packageJson.version)
const HOST_NETWORK_CACHE_TTL_MS = 60 * 60 * 1000
const PROBE_REQUEST_TIMEOUT_MS = 3_000
const DOCKER_COMMAND_TIMEOUT_MS = 15_000
const LOCAL_RUNNER = '/app/dist/local-runner.js'

type TerminalEvent = Exclude<LocalRunnerEvent, { type: 'log' }>

export const missingLocalRunnerEventMessage = (
  expectedEvent: 'inspection' | 'result',
  output: string
): string => {
  const message = `The admin-bot image did not return the expected ${expectedEvent} event.`
  return output ? `${message}\n\nLocal runner output:\n${output}` : message
}

const loopbackDockerHosts = new Set(['localhost', '127.0.0.1', '[::1]'])

export const isLocalDockerEndpoint = (endpoint: string): boolean => {
  try {
    const url = new URL(endpoint)
    if (['unix:', 'npipe:', 'fd:'].includes(url.protocol)) {
      return true
    }
    return loopbackDockerHosts.has(url.hostname.toLowerCase())
  } catch {
    return false
  }
}

const checkLocalDockerEndpoint = async (): Promise<void> => {
  let endpoint = process.env.DOCKER_HOST
  let source = 'DOCKER_HOST'

  if (process.env.DOCKER_CONTEXT || !endpoint) {
    const result = await runCommand(
      'docker',
      ['context', 'inspect', '--format', '{{json .}}'],
      { captureStdout: true }
    )
    if (result.exitCode !== 0) {
      throw new Error(
        `Could not inspect the active Docker context: ${result.stderr || 'docker context inspect failed'}`
      )
    }

    let context: {
      Name?: unknown
      Endpoints?: { docker?: { Host?: unknown } }
    }
    try {
      context = JSON.parse(result.stdout)
    } catch {
      throw new Error('Invalid JSON from Docker context inspect')
    }
    const contextEndpoint = context.Endpoints?.docker?.Host
    if (typeof contextEndpoint !== 'string') {
      throw new Error('The active Docker context has no Docker endpoint')
    }
    endpoint = contextEndpoint
    source =
      typeof context.Name === 'string'
        ? `Docker context "${context.Name}"`
        : 'The active Docker context'
  }

  if (!isLocalDockerEndpoint(endpoint)) {
    throw new Error(
      `${source} uses the non-local endpoint ${endpoint}. The admin-bot CLI requires a local Docker daemon for host networking and bind mounts. Switch to a local Docker context or pass --local.`
    )
  }
}

let localDockerEndpointCheck: Promise<void> | undefined

export const ensureLocalDockerEndpoint = async (): Promise<void> => {
  localDockerEndpointCheck ??= checkLocalDockerEndpoint()
  await localDockerEndpointCheck
}

const imageExists = async (image: string): Promise<boolean> => {
  try {
    return (
      (await runCommand('docker', ['image', 'inspect', image])).exitCode === 0
    )
  } catch (error) {
    throw new Error(
      `Could not run Docker: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

export const ensureDockerImage = async (
  image = process.env.RCTF_ADMIN_BOT_IMAGE ?? DEFAULT_IMAGE
): Promise<string> => {
  if (await imageExists(image)) {
    return image
  }

  const pull = await runCommand('docker', ['pull', image], { inherit: true })
  if (pull.exitCode !== 0 || !(await imageExists(image))) {
    throw new Error(`Could not pull admin-bot image ${image}`)
  }
  return image
}

export const hasFreshHostNetworkSuccess = async (
  dataDir: string,
  now = Date.now()
): Promise<boolean> => {
  // Avoid testing host networking every run, keep it cached for an hour
  const { hostNetworkSuccessAt } = await loadCliState(dataDir)
  return (
    hostNetworkSuccessAt !== undefined &&
    hostNetworkSuccessAt <= now &&
    now - hostNetworkSuccessAt < HOST_NETWORK_CACHE_TTL_MS
  )
}

export const cacheHostNetworkSuccess = async (
  dataDir: string,
  now = Date.now()
): Promise<void> => {
  await updateCliState(dataDir, state => ({
    ...state,
    hostNetworkSuccessAt: now,
  }))
}

export interface HostNetworkProbeResult {
  succeeded: boolean
  stderr?: string
  error?: string
}

const probeScript = `
const response = await fetch(process.env.RCTF_PROBE_URL, {
  signal: AbortSignal.timeout(${PROBE_REQUEST_TIMEOUT_MS}),
})
const body = await response.text()
if (!response.ok || body !== process.env.RCTF_PROBE_TOKEN) process.exit(1)
`

export const probeHostNetworking = async (
  image: string,
  dataDir: string
): Promise<HostNetworkProbeResult> => {
  if (await hasFreshHostNetworkSuccess(dataDir)) {
    return { succeeded: true }
  }

  const token = randomBytes(24).toString('hex')
  const route = `/${token}`
  const server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    fetch(request) {
      const url = new URL(request.url)
      return url.pathname === route
        ? new Response(token)
        : new Response('Not found', { status: 404 })
    },
  })
  const containerName = `rctf-admin-bot-network-probe-${process.pid}-${randomBytes(6).toString('hex')}`

  let result: HostNetworkProbeResult
  try {
    const commandResult = await runCommand(
      'docker',
      [
        'run',
        '--name',
        containerName,
        '--network',
        'host',
        '--entrypoint',
        'bun',
        '--env',
        `RCTF_PROBE_URL=http://127.0.0.1:${server.port}${route}`,
        '--env',
        `RCTF_PROBE_TOKEN=${token}`,
        image,
        '-e',
        probeScript,
      ],
      { timeoutMilliseconds: DOCKER_COMMAND_TIMEOUT_MS }
    )
    result =
      commandResult.exitCode === 0
        ? { succeeded: true }
        : {
            succeeded: false,
            ...(commandResult.stderr
              ? { stderr: commandResult.stderr }
              : { error: `Docker exited with code ${commandResult.exitCode}` }),
          }
  } catch (error) {
    result = {
      succeeded: false,
      error: error instanceof Error ? error.message : String(error),
    }
  } finally {
    await runCommand('docker', ['rm', '--force', containerName]).catch(
      () => undefined
    )
    await server.stop(true)
  }

  if (result.succeeded) {
    await cacheHostNetworkSuccess(dataDir).catch(() => undefined)
  }
  return result
}

export const displayProbeContainerArguments = (
  image: string,
  displayArguments: string[] = []
): string[] => [
  'run',
  '--rm',
  '--network',
  'host',
  '--read-only',
  '--security-opt',
  'no-new-privileges:true',
  '--cap-drop',
  'ALL',
  ...displayArguments,
  '--entrypoint',
  '/usr/bin/timeout',
  image,
  '3s',
  '/usr/bin/xdpyinfo',
]

export const probeDockerDisplay = async (image: string): Promise<void> => {
  await ensureLocalDockerEndpoint()
  const display = await prepareDockerDisplay()
  try {
    const result = await runCommand(
      'docker',
      displayProbeContainerArguments(image, display.args),
      { timeoutMilliseconds: DOCKER_COMMAND_TIMEOUT_MS }
    )
    if (result.exitCode !== 0) {
      throw new Error(
        dockerDisplayConnectionError(display.display, {
          probeOutput: result.stderr,
        })
      )
    }
  } finally {
    await display.cleanup()
  }
}

export const localRunnerContainerArguments = (
  image: string,
  displayArguments: string[] = [],
  containerName?: string
): string[] => {
  return [
    'run',
    '--rm',
    ...(containerName ? ['--name', containerName] : []),
    '--interactive',
    '--network',
    'host',
    '--read-only',
    '--security-opt',
    'no-new-privileges:true',
    '--cap-drop',
    'ALL',
    '--shm-size',
    '512m',
    '--tmpfs',
    '/tmp:size=512m,mode=1777',
    '--tmpfs',
    '/var/cache/fontconfig:size=64m,mode=1777',
    '--cpus',
    '2',
    '--memory',
    '3g',
    '--pids-limit',
    '1024',
    '--mount',
    'type=volume,src=rctf-admin-bot-browser-cache,dst=/data/browser-cache',
    '--env',
    'LOG_LEVEL=silent',
    ...displayArguments,
    image,
    'bun',
    LOCAL_RUNNER,
  ]
}

const registerContainerCleanup = (
  child: ChildProcess,
  containerName: string
): (() => void) => {
  let removed = false
  const remove = (signal?: NodeJS.Signals) => {
    if (removed) return
    removed = true

    const result = spawnSync('docker', ['rm', '--force', containerName], {
      stdio: 'ignore',
      timeout: DOCKER_COMMAND_TIMEOUT_MS,
      windowsHide: true,
    })
    if (result.status !== 0 && signal) child.kill(signal)
  }
  const forwardSignal = (signal: NodeJS.Signals) => remove(signal)
  const handleExit = () => remove()

  // Clack's active spinner handles Ctrl+C in raw mode with process.exit(),
  // while live runs receive SIGINT normally. Cover both shutdown paths.
  process.prependListener('SIGINT', forwardSignal)
  process.prependListener('SIGTERM', forwardSignal)
  process.prependListener('exit', handleExit)

  return () => {
    process.off('SIGINT', forwardSignal)
    process.off('SIGTERM', forwardSignal)
    process.off('exit', handleExit)
  }
}

const runProtocolRequest = async (
  image: string,
  request: LocalRunnerRequest,
  onLine?: (line: string) => void
): Promise<{
  event?: TerminalEvent
  exitCode: number
  stderr: string
}> => {
  const needsDisplay =
    request.action === 'run' && request.options.headless === false
  if (needsDisplay) {
    await ensureLocalDockerEndpoint()
  }
  const display = needsDisplay ? await prepareDockerDisplay() : undefined
  const containerName = `rctf-admin-bot-run-${randomBytes(8).toString('hex')}`
  try {
    return await new Promise((resolveResult, reject) => {
      const child = spawn(
        'docker',
        localRunnerContainerArguments(image, display?.args, containerName),
        {
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true,
        }
      )
      const removeCleanupHandlers = registerContainerCleanup(
        child,
        containerName
      )
      let event: TerminalEvent | undefined
      let stderr = ''
      let parseError: Error | undefined
      let stdinError: Error | undefined

      child.stderr.setEncoding('utf8')
      child.stderr.on('data', chunk => {
        stderr += chunk
      })
      child.stdin.once('error', error => {
        stdinError = error
      })
      const lines = createInterface({ input: child.stdout })

      lines.on('line', line => {
        if (!line || parseError) {
          return
        }
        try {
          const parsed = decodeLocalRunnerEvent(line)
          if (!parsed) {
            stderr += `${line}\n`
            return
          }
          if (parsed.type === 'log') {
            onLine?.(parsed.line)
          } else {
            event = parsed
          }
        } catch (error) {
          parseError =
            error instanceof Error
              ? error
              : new Error('Invalid response from local runner')
        }
      })

      child.once('error', error => {
        removeCleanupHandlers()
        reject(error)
      })
      child.once('close', code => {
        removeCleanupHandlers()
        lines.close()
        if (parseError) {
          reject(parseError)
          return
        }
        resolveResult({
          event,
          exitCode: code ?? 1,
          stderr: [
            stderr.trim(),
            stdinError
              ? `Failed to write local runner request: ${stdinError.message}`
              : '',
          ]
            .filter(Boolean)
            .join('\n'),
        })
      })
      child.stdin.end(JSON.stringify(request))
    })
  } finally {
    await display?.cleanup()
  }
}

export const inspectInDocker = async (
  image: string,
  source: string
): Promise<LocalInspection> => {
  const response = await runProtocolRequest(image, {
    action: 'inspect',
    source,
  })
  if (response.event?.type === 'error') {
    throw new Error(response.event.message)
  }
  if (response.event?.type !== 'inspection' || response.exitCode !== 0) {
    throw new Error(
      missingLocalRunnerEventMessage('inspection', response.stderr)
    )
  }
  return response.event.inspection
}

export const runInDocker = async (
  image: string,
  request: Extract<LocalRunnerRequest, { action: 'run' }>,
  onLine?: (line: string) => void
): Promise<LocalRunResult> => {
  const response = await runProtocolRequest(image, request, onLine)
  if (response.event?.type === 'error') {
    throw new Error(response.event.message)
  }
  if (response.event?.type !== 'result') {
    throw new Error(missingLocalRunnerEventMessage('result', response.stderr))
  }
  return response.event
}

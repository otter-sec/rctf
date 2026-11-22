import { existsSync } from 'node:fs'
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { homedir, platform as hostPlatform, tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseDisplay, type ParsedDisplay } from 'x11'

const CONTAINER_XAUTHORITY = '/tmp/rctf-admin-bot.Xauthority'

type Environment = Record<string, string | undefined>

interface DockerDisplayOptions {
  platform?: NodeJS.Platform
  environment?: Environment
  pathExists?: (path: string) => boolean
  xauthorityPath?: string
}

const mount = (source: string, destination = source): string[] => [
  '--mount',
  `type=bind,src=${source},dst=${destination},readonly`,
]

const environmentVariable = (name: string, value?: string): string[] =>
  value ? ['--env', `${name}=${value}`] : []

const parseX11Display = (display: string): ParsedDisplay => {
  try {
    return parseDisplay(display)
  } catch (error) {
    throw new Error(
      `Invalid DISPLAY ${JSON.stringify(display)}: ${error instanceof Error ? error.message : String(error)}`
    )
  }
}

const isLocalX11Display = (display: ParsedDisplay): boolean =>
  display.protocol === 'unix' ||
  display.protocol === 'local' ||
  (display.protocol === '' && (display.host === '' || display.host === 'unix'))

const isLoopbackX11Host = (host: string): boolean =>
  ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host.toLowerCase())

const displaySuffix = (display: ParsedDisplay): string =>
  `${display.displayNum}${typeof display.screenNum === 'string' ? `.${display.screenNum}` : ''}`

const dockerDesktopDisplay = (
  display: string | undefined,
  fallback: string
): string => {
  if (!display) {
    return `host.docker.internal:${fallback}`
  }
  const parsed = parseX11Display(display)
  if (
    isLocalX11Display(parsed) ||
    isLoopbackX11Host(parsed.host) ||
    parsed.host.startsWith('/')
  ) {
    return `host.docker.internal:${displaySuffix(parsed)}`
  }
  return display
}

export const dockerDisplayArguments = (
  options: DockerDisplayOptions = {}
): string[] => {
  const platform = options.platform ?? hostPlatform()
  const environment = options.environment ?? process.env
  const pathExists = options.pathExists ?? existsSync
  const display = environment.DISPLAY

  if (platform === 'darwin') {
    return environmentVariable('DISPLAY', dockerDesktopDisplay(display, '0'))
  }

  if (platform === 'win32') {
    return environmentVariable('DISPLAY', dockerDesktopDisplay(display, '0.0'))
  }

  if (platform !== 'linux') {
    throw new Error(
      `Docker --headful is not supported on ${platform}; pass --local instead.`
    )
  }

  if (!display) {
    throw new Error(
      'Docker --headful requires DISPLAY. Start an X11 session, set DISPLAY to a TCP X server, or pass --local.'
    )
  }
  const parsed = parseX11Display(display)
  const isLocal = isLocalX11Display(parsed)

  const hasX11Socket = pathExists('/tmp/.X11-unix')
  if (pathExists('/mnt/wslg') && hasX11Socket && isLocal) {
    return [
      ...mount('/tmp/.X11-unix'),
      ...environmentVariable('DISPLAY', display),
    ]
  }
  if (isLocal && !hasX11Socket) {
    throw new Error(
      'Docker --headful cannot find the local X11 socket. Enable WSLg, configure a TCP X server, or pass --local.'
    )
  }

  return [
    ...(isLocal ? mount('/tmp/.X11-unix') : []),
    ...environmentVariable('DISPLAY', display),
    ...(options.xauthorityPath
      ? [
          ...mount(options.xauthorityPath, CONTAINER_XAUTHORITY),
          ...environmentVariable('XAUTHORITY', CONTAINER_XAUTHORITY),
        ]
      : []),
  ]
}

const displayXauthority = (
  contents: Buffer,
  requestedDisplayNumber: string
): Buffer => {
  const encodedDisplayNumber = Buffer.from(requestedDisplayNumber)

  const records: Buffer[] = []
  let offset = 0

  while (offset < contents.length) {
    const recordStart = offset
    if (offset + 2 > contents.length) {
      throw new Error('Invalid Xauthority file')
    }
    offset += 2

    let number: Buffer | undefined
    for (let field = 0; field < 4; field++) {
      if (offset + 2 > contents.length) {
        throw new Error('Invalid Xauthority file')
      }
      const length = contents.readUInt16BE(offset)
      offset += 2
      if (offset + length > contents.length) {
        throw new Error('Invalid Xauthority file')
      }
      if (field === 1) {
        number = contents.subarray(offset, offset + length)
      }
      offset += length
    }

    if (number?.equals(encodedDisplayNumber)) {
      const record = Buffer.from(contents.subarray(recordStart, offset))
      record.writeUInt16BE(0xffff, 0)
      records.push(record)
    }
  }

  return Buffer.concat(records)
}

export const prepareDockerDisplay = async (
  options: DockerDisplayOptions = {}
): Promise<{
  args: string[]
  display: string
  cleanup: () => Promise<void>
}> => {
  const platform = options.platform ?? hostPlatform()
  const environment = options.environment ?? process.env
  const pathExists = options.pathExists ?? existsSync
  const parsedDisplay = environment.DISPLAY
    ? parseX11Display(environment.DISPLAY)
    : undefined
  const hasWslg =
    platform === 'linux' &&
    parsedDisplay !== undefined &&
    isLocalX11Display(parsedDisplay) &&
    pathExists('/mnt/wslg') &&
    pathExists('/tmp/.X11-unix')

  let temporaryDirectory: string | undefined
  let xauthorityPath = options.xauthorityPath
  const cleanup = async () => {
    if (temporaryDirectory) {
      await rm(temporaryDirectory, { recursive: true, force: true })
    }
  }
  try {
    if (platform === 'linux' && !hasWslg && !xauthorityPath && parsedDisplay) {
      const source = environment.XAUTHORITY ?? join(homedir(), '.Xauthority')
      if (pathExists(source)) {
        temporaryDirectory = await mkdtemp(
          join(tmpdir(), 'rctf-admin-bot-xauthority-')
        )
        xauthorityPath = join(temporaryDirectory, 'Xauthority')
        await writeFile(
          xauthorityPath,
          displayXauthority(await readFile(source), parsedDisplay.displayNum),
          { mode: 0o644 }
        )
        await chmod(xauthorityPath, 0o644)
      }
    }

    const args = dockerDisplayArguments({
      ...options,
      platform,
      environment,
      pathExists,
      xauthorityPath,
    })
    const display = args
      .find(argument => argument.startsWith('DISPLAY='))!
      .slice('DISPLAY='.length)
    return {
      args,
      display,
      cleanup,
    }
  } catch (error) {
    await cleanup()
    throw error
  }
}

export const dockerDisplayConnectionError = (
  display: string,
  options: Pick<DockerDisplayOptions, 'platform' | 'pathExists'> & {
    probeOutput?: string
  } = {}
): string => {
  const platform = options.platform ?? hostPlatform()
  const pathExists = options.pathExists ?? existsSync

  let message: string
  if (platform === 'win32') {
    message = `No X server is reachable from Docker at ${display}. Start VcXsrv, GWSL, or X410 with TCP connections enabled and allow it through Windows Firewall. Set DISPLAY if it uses another display, or pass --local.`
  } else if (
    platform === 'darwin' &&
    display.startsWith('host.docker.internal:')
  ) {
    message = `XQuartz is not reachable from Docker at ${display}. Start XQuartz, enable "Allow connections from network clients", and run "/opt/X11/bin/xhost +localhost".`
  } else {
    const isLocal = isLocalX11Display(parseX11Display(display))
    if (pathExists('/mnt/wslg') && isLocal) {
      message = `The WSLg display ${display} is not reachable from Docker. Enable Docker Desktop integration for this WSL distribution, or pass --local.`
    } else if (isLocal) {
      message = `The X11 display ${display} is not reachable from Docker. Check DISPLAY and Xauthority access, or pass --local.`
    } else {
      message = `The X server ${display} is not reachable from Docker. Check its address, access controls, and firewall, or pass --local.`
    }
  }

  return options.probeOutput
    ? `${message}\n\nDisplay probe output:\n${options.probeOutput}`
    : message
}

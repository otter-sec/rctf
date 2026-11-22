import pc from 'picocolors'

export const DEFAULT_LOCAL_FLAG = 'rctf{local_test_flag}'

export const localFlag = (
  environment: Record<string, string | undefined> = process.env
): string => environment.FLAG ?? DEFAULT_LOCAL_FLAG

export const normalizeCliAliases = (args: string[]): string[] => {
  // citty argument parser does not support `--` aliases, implemented here before parsing
  let parseOptions = true
  return args.map(arg => {
    if (arg === '--') {
      parseOptions = false
      return arg
    }
    if (!parseOptions) {
      return arg
    }
    if (arg === '--gui') {
      return '--headful'
    }
    if (arg === '--no-gui') {
      return '--no-headful'
    }
    return arg
  })
}

export const parseTimeout = (value: string | undefined): number | undefined => {
  if (value === undefined) {
    return undefined
  }

  const timeout = Number(value)
  if (!Number.isSafeInteger(timeout) || timeout < 0) {
    throw new Error('--timeout must be a non-negative integer in milliseconds')
  }
  return timeout
}

export const shouldNormalizeInputRules = (
  args: Record<string, unknown>
): boolean => {
  // Citty parses -n as the declared no-normalize option, but parses the long
  // --no-normalize form as a negated synthetic normalize option.
  return args['no-normalize'] !== true && args.normalize !== false
}

export const validateInput = (
  value: string,
  rule: { pattern: string; flags?: string }
): string | undefined => {
  if (!value.trim()) {
    return 'This field is required.'
  }
  try {
    if (!new RegExp(rule.pattern, rule.flags).test(value)) {
      return `Does not match the required format (${rule.pattern}).`
    }
  } catch (error) {
    return `The config contains an invalid regular expression: ${error instanceof Error ? error.message : String(error)}`
  }
  return undefined
}

export const collectPositionalInputs = (
  entries: [string, { pattern: string; flags?: string }][],
  values: string[],
  validate: (
    value: string,
    rule: { pattern: string; flags?: string }
  ) => string | undefined = validateInput
): Record<string, string> => {
  if (values.length > entries.length) {
    throw new Error(
      `Expected at most ${entries.length} input arguments, received ${values.length}.`
    )
  }

  const inputs: Record<string, string> = {}
  for (const [index, value] of values.entries()) {
    const [name, rule] = entries[index]!
    const error = validate(value, rule)
    if (error) {
      throw new Error(`Input "${name}": ${error}`)
    }
    inputs[name] = value
  }
  return inputs
}

interface LogEntry {
  time: number
  level: 'info' | 'warn' | 'error' | 'fatal'
  prefix: string
  line: string
  extra: Record<string, unknown>
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const parseLogEntry = (line: string): LogEntry | undefined => {
  try {
    const entry: unknown = JSON.parse(line)
    if (
      !isRecord(entry) ||
      typeof entry.time !== 'number' ||
      !['info', 'warn', 'error', 'fatal'].includes(String(entry.level)) ||
      typeof entry.prefix !== 'string' ||
      typeof entry.line !== 'string'
    ) {
      return undefined
    }
    return {
      time: entry.time,
      level: entry.level as LogEntry['level'],
      prefix: entry.prefix,
      line: entry.line,
      extra: isRecord(entry.extra) ? entry.extra : {},
    }
  } catch {
    return undefined
  }
}

const formatTime = (time: number): string => {
  const date = new Date(time)
  const pad = (value: number) => value.toString().padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

const levelColor = (level: LogEntry['level'], text: string): string => {
  if (level === 'error' || level === 'fatal') {
    return pc.red(text)
  }
  if (level === 'warn') {
    return pc.yellow(text)
  }
  return pc.dim(text)
}

const formatExtra = (value: unknown): string =>
  typeof value === 'string' ? value : JSON.stringify(value)

export const renderLogs = (jsonl: string, verbose = false): string => {
  const lines: string[] = []
  for (const raw of jsonl.split('\n')) {
    const entry = parseLogEntry(raw)
    if (!entry) {
      continue
    }
    const { id, ...extra } = entry.extra
    const renderedId = id === undefined ? undefined : formatExtra(id)
    const renderedPrefix =
      renderedId === undefined ? entry.prefix : `${renderedId} ${entry.prefix}`

    lines.push(
      [
        pc.dim(formatTime(entry.time)),
        levelColor(entry.level, entry.level.charAt(0).toUpperCase()),
        pc.cyan(`[${renderedPrefix}]`),
        levelColor(entry.level, entry.line),
      ].join(' ')
    )

    if (verbose) {
      for (const [key, value] of Object.entries(extra)) {
        const [first = '', ...continuation] = formatExtra(value).split('\n')
        lines.push(`  ${pc.dim(`${key}:`)} ${pc.dim(first)}`)
        lines.push(
          ...continuation.map(line => `    ${pc.dim(line.trimStart())}`)
        )
      }
    }
  }
  return lines.join('\n')
}

import { defaultMaxLogLines, defaultMaxLogParamChars } from './const'

const truncateValue = (value: string, maxChars: number): string => {
  if (value.length <= maxChars) {
    return value
  }
  return value.slice(0, maxChars) + '...[truncated]'
}

const sanitizeOptions = (
  options: Record<string, unknown>,
  maxChars: number
): Record<string, unknown> => {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(options)) {
    result[key] =
      typeof value === 'string' ? truncateValue(value, maxChars) : value
  }
  return result
}

export type LogLevel = 'info' | 'warn' | 'error' | 'fatal'
export type LogPrefix =
  | 'console'
  | 'navigation'
  | 'network'
  | 'admin-bot'
  | 'challenge'
  | 'dialog'

export abstract class OutputHandler {
  protected readonly maxValueChars: number | null

  constructor(maxValueChars?: number | null) {
    // null = disable truncation (do not do that)
    this.maxValueChars =
      maxValueChars === undefined ? defaultMaxLogParamChars : maxValueChars
  }

  abstract writeLine(line: string): void
  abstract close(): void

  log(
    level: LogLevel,
    prefix: LogPrefix,
    line: string,
    options?: Record<string, unknown>
  ): void {
    this.writeLine(
      JSON.stringify({
        time: Date.now(),
        level,
        prefix,
        line:
          this.maxValueChars !== null
            ? truncateValue(line, this.maxValueChars)
            : line,
        extra:
          this.maxValueChars !== null
            ? sanitizeOptions(options || {}, this.maxValueChars)
            : options || {},
      })
    )
  }

  info(
    prefix: LogPrefix,
    line: string,
    options?: Record<string, unknown>
  ): void {
    this.log('info', prefix, line, options)
  }

  warn(
    prefix: LogPrefix,
    line: string,
    options?: Record<string, unknown>
  ): void {
    this.log('warn', prefix, line, options)
  }

  error(
    prefix: LogPrefix,
    line: string,
    options?: Record<string, unknown>
  ): void {
    this.log('error', prefix, line, options)
  }

  fatal(
    prefix: LogPrefix,
    line: string,
    options?: Record<string, unknown>
  ): void {
    this.log('fatal', prefix, line, options)
  }
}

export class ConsoleOutputHandler extends OutputHandler {
  private closed: boolean = false
  constructor() {
    super(null)
  }

  writeLine(line: string) {
    if (this.closed) {
      return
    }
    console.log(line)
  }

  close() {
    this.closed = true
  }
}

export class BufferedOutputHandler extends OutputHandler {
  private closed: boolean = false
  private lines: string[] = []
  private readonly maxLines: number | null

  constructor(maxLines?: number | null, maxValueChars?: number | null) {
    super(maxValueChars)

    // null = disable limit (do not do that)
    this.maxLines = maxLines === undefined ? defaultMaxLogLines : maxLines
  }

  writeLine(line: string) {
    if (this.closed) {
      return
    }

    if (this.maxLines !== null) {
      while (this.lines.length >= this.maxLines) {
        this.lines.shift()
      }
    }

    this.lines.push(line)
  }

  close() {
    this.closed = true
  }

  getOutput(): string {
    return this.lines.join('\n')
  }
}

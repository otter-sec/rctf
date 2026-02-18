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
  private readonly maxLines: number | null
  private buffer: string[]
  private head: number = 0
  private count: number = 0

  constructor(maxLines?: number | null, maxValueChars?: number | null) {
    super(maxValueChars)

    // null = disable limit (do not do that)
    this.maxLines = maxLines === undefined ? defaultMaxLogLines : maxLines
    this.buffer = this.maxLines !== null ? new Array(this.maxLines) : []
  }

  writeLine(line: string) {
    if (this.closed) {
      return
    }

    if (this.maxLines !== null) {
      this.buffer[this.head] = line
      this.head = (this.head + 1) % this.maxLines
      if (this.count < this.maxLines) {
        this.count++
      }
    } else {
      this.buffer.push(line)
    }
  }

  close() {
    this.closed = true
  }

  getOutput(): string {
    if (this.maxLines === null) {
      return this.buffer.join('\n')
    }

    const result = new Array(this.count)
    for (let i = 0; i < this.count; i++) {
      result[i] =
        this.buffer[
          (this.head - this.count + i + this.maxLines) % this.maxLines
        ]
    }
    return result.join('\n')
  }
}

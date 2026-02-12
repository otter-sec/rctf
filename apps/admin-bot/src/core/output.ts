import type { OutputHandler } from '../types'
import { defaultMaxOutputChars } from './const'

export class ConsoleOutputHandler implements OutputHandler {
  private closed: boolean = false

  async writeLine(line: string): Promise<void> {
    if (this.closed) {
      return
    }
    console.log(line)
  }

  async flush(): Promise<void> {}

  async close(): Promise<void> {
    this.closed = true
  }
}

export class BufferedOutputHandler implements OutputHandler {
  private closed: boolean = false
  private buffer: string = ''
  private readonly maxChars: number | null

  constructor(maxChars?: number | null) {
    // null = disable limit (very dangerous, do not do that)
    this.maxChars = maxChars === undefined ? defaultMaxOutputChars : maxChars
  }

  async writeLine(line: string): Promise<void> {
    if (this.closed) {
      return
    }

    const entry = line + '\n'
    if (this.maxChars !== null) {
      if (entry.length >= this.maxChars) {
        this.buffer = entry.slice(-this.maxChars)
        return
      }

      const room = this.maxChars - entry.length
      if (this.buffer.length > room) {
        this.buffer = this.buffer.slice(-room)
      }
    }

    this.buffer += entry
  }

  async flush(): Promise<void> {}

  async close(): Promise<void> {
    this.closed = true
  }

  getOutput(): string {
    return this.buffer
  }
}

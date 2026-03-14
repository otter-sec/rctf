import { describe, expect, test } from 'bun:test'
import {
  BufferedOutputHandler,
  ConsoleOutputHandler,
} from '../../../../apps/admin-bot/src/core/output'

describe('BufferedOutputHandler', () => {
  test('stores lines up to maxLines', () => {
    const handler = new BufferedOutputHandler(3)
    handler.writeLine('a')
    handler.writeLine('b')
    handler.writeLine('c')
    expect(handler.getOutput()).toBe('a\nb\nc')
  })

  test('ring buffer wraps around and preserves order', () => {
    const handler = new BufferedOutputHandler(3)
    handler.writeLine('a')
    handler.writeLine('b')
    handler.writeLine('c')
    handler.writeLine('d')
    handler.writeLine('e')
    // Should keep last 3: c, d, e
    expect(handler.getOutput()).toBe('c\nd\ne')
  })

  test('getOutput preserves insertion order after multiple wraps', () => {
    const handler = new BufferedOutputHandler(2)
    handler.writeLine('1')
    handler.writeLine('2')
    handler.writeLine('3')
    handler.writeLine('4')
    handler.writeLine('5')
    expect(handler.getOutput()).toBe('4\n5')
  })

  test('returns empty string when no lines written', () => {
    const handler = new BufferedOutputHandler(5)
    expect(handler.getOutput()).toBe('')
  })

  test('close stops accepting writes', () => {
    const handler = new BufferedOutputHandler(5)
    handler.writeLine('before')
    handler.close()
    handler.writeLine('after')
    expect(handler.getOutput()).toBe('before')
  })

  test('null maxLines works as unbounded array', () => {
    const handler = new BufferedOutputHandler(null)
    for (let i = 0; i < 200; i++) {
      handler.writeLine(`line-${i}`)
    }
    const output = handler.getOutput()
    const lines = output.split('\n')
    expect(lines.length).toBe(200)
    expect(lines[0]).toBe('line-0')
    expect(lines[199]).toBe('line-199')
  })
})

describe('OutputHandler.log', () => {
  test('writes JSON with time, level, prefix, line, extra', () => {
    const handler = new BufferedOutputHandler(10)
    handler.log('info', 'admin-bot', 'test message', { key: 'value' })
    const output = handler.getOutput()
    const parsed = JSON.parse(output)
    expect(parsed.time).toBeNumber()
    expect(parsed.level).toBe('info')
    expect(parsed.prefix).toBe('admin-bot')
    expect(parsed.line).toBe('test message')
    expect(parsed.extra).toEqual({ key: 'value' })
  })

  test('truncates line when exceeding maxValueChars', () => {
    const handler = new BufferedOutputHandler(10, 20)
    const longLine = 'a'.repeat(50)
    handler.log('info', 'admin-bot', longLine)
    const parsed = JSON.parse(handler.getOutput())
    expect(parsed.line).toBe('a'.repeat(20) + '...[truncated]')
  })

  test('truncates string values in extra options', () => {
    const handler = new BufferedOutputHandler(10, 10)
    handler.log('info', 'admin-bot', 'msg', {
      short: 'ok',
      long: 'a'.repeat(30),
      num: 42,
    })
    const parsed = JSON.parse(handler.getOutput())
    expect(parsed.extra.short).toBe('ok')
    expect(parsed.extra.long).toBe('a'.repeat(10) + '...[truncated]')
    expect(parsed.extra.num).toBe(42)
  })

  test('defaults extra to empty object when not provided', () => {
    const handler = new BufferedOutputHandler(10)
    handler.log('info', 'admin-bot', 'msg')
    const parsed = JSON.parse(handler.getOutput())
    expect(parsed.extra).toEqual({})
  })
})

describe('OutputHandler convenience methods', () => {
  test('info() sets level to info', () => {
    const handler = new BufferedOutputHandler(10)
    handler.info('admin-bot', 'test')
    const parsed = JSON.parse(handler.getOutput())
    expect(parsed.level).toBe('info')
  })

  test('warn() sets level to warn', () => {
    const handler = new BufferedOutputHandler(10)
    handler.warn('admin-bot', 'test')
    const parsed = JSON.parse(handler.getOutput())
    expect(parsed.level).toBe('warn')
  })

  test('error() sets level to error', () => {
    const handler = new BufferedOutputHandler(10)
    handler.error('admin-bot', 'test')
    const parsed = JSON.parse(handler.getOutput())
    expect(parsed.level).toBe('error')
  })

  test('fatal() sets level to fatal', () => {
    const handler = new BufferedOutputHandler(10)
    handler.fatal('admin-bot', 'test')
    const parsed = JSON.parse(handler.getOutput())
    expect(parsed.level).toBe('fatal')
  })
})

describe('ConsoleOutputHandler', () => {
  test('close stops accepting writes', () => {
    const handler = new ConsoleOutputHandler()
    const logs: string[] = []
    const origLog = console.log
    console.log = (msg: string) => logs.push(msg)
    try {
      handler.writeLine('before')
      handler.close()
      handler.writeLine('after')
      expect(logs).toEqual(['before'])
    } finally {
      console.log = origLog
    }
  })
})

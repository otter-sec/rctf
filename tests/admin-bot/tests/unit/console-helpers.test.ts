import { describe, expect, test } from 'bun:test'
import {
  consoleMsgTypeToLevel,
  createConsoleCallback,
  serializeRemoteObject,
} from '../../../../apps/admin-bot/src/browser/hooks/console'
import { BufferedOutputHandler } from '../../../../apps/admin-bot/src/core/output'

describe('serializeRemoteObject', () => {
  test('handles undefined type', () => {
    expect(serializeRemoteObject({ type: 'undefined' } as any)).toBe(
      'undefined'
    )
  })

  test('handles primitive value', () => {
    expect(
      serializeRemoteObject({ type: 'string', value: 'hello' } as any)
    ).toBe('hello')
    expect(serializeRemoteObject({ type: 'number', value: 42 } as any)).toBe(
      '42'
    )
    expect(serializeRemoteObject({ type: 'boolean', value: true } as any)).toBe(
      'true'
    )
  })

  test('handles object value with JSON.stringify', () => {
    expect(
      serializeRemoteObject({
        type: 'object',
        value: { a: 1, b: 'two' },
      } as any)
    ).toBe('{"a":1,"b":"two"}')
  })

  test('handles unserializableValue', () => {
    expect(
      serializeRemoteObject({
        type: 'number',
        unserializableValue: 'Infinity',
      } as any)
    ).toBe('Infinity')
    expect(
      serializeRemoteObject({
        type: 'bigint',
        unserializableValue: '123n',
      } as any)
    ).toBe('123n')
  })

  test('handles preview with properties', () => {
    expect(
      serializeRemoteObject({
        type: 'object',
        preview: {
          properties: [
            { name: 'x', value: '1' },
            { name: 'y', value: '2' },
          ],
        },
      } as any)
    ).toBe('{x: 1, y: 2}')
  })

  test('handles preview with valuePreview description fallback', () => {
    expect(
      serializeRemoteObject({
        type: 'object',
        preview: {
          properties: [
            {
              name: 'arr',
              value: undefined,
              valuePreview: { description: 'Array(3)' },
            },
          ],
        },
      } as any)
    ).toBe('{arr: Array(3)}')
  })

  test('handles preview with ? fallback', () => {
    expect(
      serializeRemoteObject({
        type: 'object',
        preview: {
          properties: [{ name: 'x' }],
        },
      } as any)
    ).toBe('{x: ?}')
  })

  test('handles empty preview properties', () => {
    expect(
      serializeRemoteObject({
        type: 'object',
        preview: { properties: [] },
      } as any)
    ).toBe('{}')
  })

  test('handles description', () => {
    expect(
      serializeRemoteObject({
        type: 'function',
        description: 'function foo() { ... }',
      } as any)
    ).toBe('function foo() { ... }')
  })

  test('handles deepSerializedValue', () => {
    expect(
      serializeRemoteObject({
        type: 'object',
        deepSerializedValue: { value: 'deep-value' },
      } as any)
    ).toBe('deep-value')
  })

  test('falls back to [unknown]', () => {
    expect(serializeRemoteObject({ type: 'object' } as any)).toBe('[unknown]')
  })
})

describe('consoleMsgTypeToLevel', () => {
  test('maps error to error', () => {
    expect(consoleMsgTypeToLevel['error']).toBe('error')
  })

  test('maps warning to warn (CDP type)', () => {
    expect(consoleMsgTypeToLevel['warning']).toBe('warn')
  })

  test('maps warn to warn (Puppeteer page type)', () => {
    expect(consoleMsgTypeToLevel['warn']).toBe('warn')
  })

  test('does not define other types (fallback to info)', () => {
    expect(consoleMsgTypeToLevel['log']).toBeUndefined()
    expect(consoleMsgTypeToLevel['info']).toBeUndefined()
  })
})

describe('createConsoleCallback', () => {
  test('respects showConsoleLogs=false', () => {
    const output = new BufferedOutputHandler(10)
    const config = {
      showConsoleLogs: false,
      showBrowserErrors: false,
      showNavigation: false,
      limitTabsNumber: -1,
    }
    const callback = createConsoleCallback(output, config, 'T1')
    callback({
      type: 'log',
      args: [{ type: 'string', value: 'test' }],
      executionContextId: 1,
      timestamp: 0,
    } as any)
    expect(output.getOutput()).toBe('')
  })

  test('serializes args and logs with correct level and target id', () => {
    const output = new BufferedOutputHandler(10)
    const config = {
      showConsoleLogs: true,
      showBrowserErrors: false,
      showNavigation: false,
      limitTabsNumber: -1,
    }
    const callback = createConsoleCallback(output, config, 'T1')
    callback({
      type: 'error',
      args: [
        { type: 'string', value: 'err' },
        { type: 'number', value: 42 },
      ],
      executionContextId: 1,
      timestamp: 0,
    } as any)
    const parsed = JSON.parse(output.getOutput())
    expect(parsed.level).toBe('error')
    expect(parsed.prefix).toBe('console')
    expect(parsed.line).toBe('console.error: err 42')
    expect(parsed.extra.id).toBe('T1')
  })

  test('defaults to info level for unknown message types', () => {
    const output = new BufferedOutputHandler(10)
    const config = {
      showConsoleLogs: true,
      showBrowserErrors: false,
      showNavigation: false,
      limitTabsNumber: -1,
    }
    const callback = createConsoleCallback(output, config, 'T1')
    callback({
      type: 'log',
      args: [{ type: 'string', value: 'msg' }],
      executionContextId: 1,
      timestamp: 0,
    } as any)
    const parsed = JSON.parse(output.getOutput())
    expect(parsed.level).toBe('info')
  })
})

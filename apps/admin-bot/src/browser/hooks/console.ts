import type { Protocol } from 'puppeteer'
import type { LogLevel, OutputHandler } from '../../core/output'
import type { NormalizedHooksConfig } from './index'

export const consoleMsgTypeToLevel: Record<string, LogLevel> = {
  error: 'error',
  warning: 'warn',
  // if not defined fallbacks to info
}

const serializeRemoteObject = (arg: Protocol.Runtime.RemoteObject): string => {
  if (arg.type === 'undefined') {
    return 'undefined'
  }

  if (arg.value !== undefined) {
    if (arg.type === 'object') {
      try {
        return JSON.stringify(arg.value)
      } catch {}
    }
    return String(arg.value)
  }

  if (arg.unserializableValue !== undefined) {
    return String(arg.unserializableValue)
  }

  if (arg.preview) {
    const props = arg.preview.properties
      ?.map(p => `${p.name}: ${p.value ?? p.valuePreview?.description ?? '?'}`)
      .join(', ')
    return `{${props || ''}}`
  }

  if (arg.description !== undefined) {
    return arg.description
  }

  if (arg.deepSerializedValue?.value !== undefined) {
    return String(arg.deepSerializedValue.value)
  }

  return '[unknown]'
}

// ref: https://stackoverflow.com/a/74223105
export const createConsoleCallback =
  (output: OutputHandler, config: NormalizedHooksConfig, id: string) =>
  (event: Protocol.Runtime.ConsoleAPICalledEvent) => {
    if (!config.showConsoleLogs) {
      return
    }

    const msgType = event.type
    const message = event.args.map(serializeRemoteObject).join(' ')

    output.log(
      consoleMsgTypeToLevel[msgType] ?? 'info',
      'console',
      `console.${msgType}: ${message}`,
      {
        id,
      }
    )
  }

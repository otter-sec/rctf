import { TextPrompt, updateSettings, type State } from '@clack/core'
import type { Readable, Writable } from 'node:stream'
import pc from 'picocolors'
import { InputHistoryNavigator } from './history'

updateSettings({ aliases: { '\x04': 'cancel' } })

const symbols = {
  active: '◆',
  cancel: '■',
  error: '▲',
  submit: '◇',
} as const

const symbol = (state: State): string => {
  if (state === 'cancel') return pc.red(symbols.cancel)
  if (state === 'error') return pc.yellow(symbols.error)
  if (state === 'submit') return pc.green(symbols.submit)
  return pc.cyan(symbols.active)
}

interface HistoryTextOptions {
  message: string
  placeholder?: string
  validate?: (value: string) => string | Error | undefined
  history: string[]
  input?: Readable
  output?: Writable
}

class HistoryTextPrompt extends TextPrompt {
  private readonly history: InputHistoryNavigator

  constructor(options: HistoryTextOptions) {
    super({
      input: options.input,
      output: options.output,
      validate: options.validate
        ? value => options.validate!(value ?? '')
        : undefined,
      placeholder: options.placeholder,
      render() {
        const bar = '│'
        const end = '└'
        const title = `${pc.gray(bar)}\n${symbol(this.state)}  ${options.message}\n`
        const placeholder = options.placeholder
          ? pc.inverse(options.placeholder[0]!) +
            pc.dim(options.placeholder.slice(1))
          : pc.inverse(pc.hidden('_'))
        const value = !this.value ? placeholder : this.userInputWithCursor

        if (this.state === 'error') {
          return `${title.trim()}\n${pc.yellow(bar)}  ${value}\n${pc.yellow(end)}  ${pc.yellow(this.error)}\n`
        }
        if (this.state === 'submit') {
          return `${title}${pc.gray(bar)}  ${pc.dim(this.value || options.placeholder)}`
        }
        if (this.state === 'cancel') {
          const cancelled = pc.strikethrough(pc.dim(this.value ?? ''))
          return `${title}${pc.gray(bar)}  ${cancelled}${this.value?.trim() ? `\n${pc.gray(bar)}` : ''}`
        }
        return `${title}${pc.cyan(bar)}  ${value}\n${pc.cyan(end)}\n`
      },
    })

    this.history = new InputHistoryNavigator(options.history)
    this.on('cursor', action => {
      if (action === 'up') {
        this.replaceValue(this.history.previous(this.value ?? ''))
      } else if (action === 'down') {
        this.replaceValue(this.history.next(this.value ?? ''))
      }
    })
  }

  private replaceValue(value: string): void {
    this._clearUserInput()
    this._setUserInput(value, true)
  }
}

export const historyText = async (options: HistoryTextOptions) =>
  (await new HistoryTextPrompt(options).prompt()) ?? ''

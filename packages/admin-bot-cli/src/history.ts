const MAX_HISTORY_ENTRIES = 100

export const normalizeInputHistory = (values: unknown[]): string[] => {
  const result: string[] = []
  for (const value of values) {
    if (typeof value !== 'string' || !value || result.includes(value)) {
      continue
    }
    result.push(value)
    if (result.length === MAX_HISTORY_ENTRIES) {
      break
    }
  }
  return result
}

export class InputHistoryNavigator {
  private readonly values: string[]
  private index = -1
  private draft = ''

  constructor(values: string[]) {
    this.values = values
  }

  previous(current: string): string {
    if (this.values.length === 0) {
      return current
    }
    if (this.index === -1) {
      this.draft = current
    }
    this.index = Math.min(this.index + 1, this.values.length - 1)
    return this.values[this.index]!
  }

  next(current: string): string {
    if (this.index === -1) {
      return current
    }
    this.index--
    return this.index === -1 ? this.draft : this.values[this.index]!
  }
}

export const mergeInputHistory = (
  history: string[],
  inputs: string[]
): string[] => {
  const newestFirst = [...inputs].reverse()
  return normalizeInputHistory([...newestFirst, ...history])
}

export type ConfirmRequest = {
  title: string
  message: string
  confirmLabel: string
  destructive: boolean
  run: () => void
}

export type ConfirmState = {
  readonly current: ConfirmRequest | null
  request(req: ConfirmRequest): void
  confirm(): void
  cancel(): void
}

export function createConfirmState(): ConfirmState {
  let current = $state<ConfirmRequest | null>(null)

  return {
    get current() {
      return current
    },
    request(req) {
      current = req
    },
    confirm() {
      const request = current
      current = null
      request?.run()
    },
    cancel() {
      current = null
    },
  }
}

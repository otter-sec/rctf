export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

let nextId = 0

function createToastStore() {
  let toasts = $state<Toast[]>([])

  return {
    get toasts() {
      return toasts
    },
    add(message: string, type: ToastType = 'info', duration = 5000) {
      const id = nextId++
      const toast: Toast = { id, message, type }
      toasts = [...toasts, toast]

      if (duration > 0) {
        setTimeout(() => {
          this.remove(id)
        }, duration)
      }

      return id
    },
    success(message: string, duration?: number) {
      return this.add(message, 'success', duration)
    },
    error(message: string, duration?: number) {
      return this.add(message, 'error', duration)
    },
    info(message: string, duration?: number) {
      return this.add(message, 'info', duration)
    },
    remove(id: number) {
      toasts = toasts.filter(t => t.id !== id)
    },
    clear() {
      toasts = []
    },
  }
}

export const toast = createToastStore()

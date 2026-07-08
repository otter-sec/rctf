import * as zagToast from '@zag-js/toast'

export const toaster = zagToast.createStore({
  placement: 'bottom-end',
  overlap: false,
})

type ToastOptions = {
  duration?: number
}

export const toast = {
  success(msg: string, options?: ToastOptions): void {
    toaster.success({ title: msg, ...options })
  },
  error(msg: string, options?: ToastOptions): void {
    toaster.error({ title: msg, ...options })
  },
  info(msg: string, options?: ToastOptions): void {
    toaster.info({ title: msg, ...options })
  },
  warning(msg: string, options?: ToastOptions): void {
    toaster.warning({ title: msg, ...options })
  },
  loading(msg: string, options?: ToastOptions): void {
    toaster.loading({ title: msg, ...options })
  },
  dismiss(): void {
    toaster.dismiss()
  },
}

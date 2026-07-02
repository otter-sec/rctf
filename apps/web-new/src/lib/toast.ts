import * as zagToast from '@zag-js/toast'

export const toaster = zagToast.createStore({
  placement: 'bottom-end',
  overlap: false,
})

export const toast = {
  success(msg: string): void {
    toaster.success({ title: msg })
  },
  error(msg: string): void {
    toaster.error({ title: msg })
  },
  info(msg: string): void {
    toaster.info({ title: msg })
  },
  warning(msg: string): void {
    toaster.warning({ title: msg })
  },
  loading(msg: string): void {
    toaster.loading({ title: msg })
  },
  dismiss(): void {
    toaster.dismiss()
  },
}

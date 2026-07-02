declare global {
  namespace App {
    interface PageState {
      /** True while the mobile challenge-detail drawer owns the top history entry. */
      challengeDrawer?: boolean
    }
  }

  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export {}

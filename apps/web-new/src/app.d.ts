declare global {
  namespace App {
    interface PageState {
      challengeDrawer?: boolean
    }
  }

  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

export {}

declare global {
  namespace App {}

  interface Window {
    dataLayer: IArguments[]
    gtag: (...args: unknown[]) => void
  }
}

export {}

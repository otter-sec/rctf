export type DownloadFile = { name: string; url: string }

export type DownloadRunCallbacks = {
  onDone?: () => void
  onError?: (fileName: string) => void
}

export type DownloadSchedulerDeps = {
  navigate: (file: DownloadFile, reportError: () => void) => void
  setTimer: (callback: () => void, delayMs: number) => number
  clearTimer: (id: number) => void
  spacingMs?: number
}

export type DownloadScheduler = {
  run: (
    files: readonly DownloadFile[],
    callbacks?: DownloadRunCallbacks
  ) => void
  cancel: () => void
  readonly busy: boolean
}

const DEFAULT_SPACING_MS = 300
const IFRAME_GRACE_MS = 60_000

export function createDownloadScheduler(
  deps: DownloadSchedulerDeps
): DownloadScheduler {
  const spacing = deps.spacingMs ?? DEFAULT_SPACING_MS
  const pending = new Set<number>()
  let busy = false
  let generation = 0

  function cancel(): void {
    for (const id of pending) deps.clearTimer(id)
    pending.clear()
    generation += 1
    busy = false
  }

  function run(
    files: readonly DownloadFile[],
    callbacks: DownloadRunCallbacks = {}
  ): void {
    cancel()
    const runGeneration = generation
    if (files.length === 0) {
      callbacks.onDone?.()
      return
    }
    busy = true
    const lastIndex = files.length - 1
    files.forEach((file, index) => {
      const id = deps.setTimer(() => {
        pending.delete(id)
        if (generation !== runGeneration) return
        deps.navigate(file, () => {
          if (generation === runGeneration) callbacks.onError?.(file.name)
        })
        if (index === lastIndex) {
          busy = false
          callbacks.onDone?.()
        }
      }, index * spacing)
      pending.add(id)
    })
  }

  return {
    run,
    cancel,
    get busy() {
      return busy
    },
  }
}

function navigateViaIframe(file: DownloadFile, reportError: () => void): void {
  const iframe = document.createElement('iframe')
  iframe.hidden = true
  iframe.setAttribute('aria-hidden', 'true')
  iframe.tabIndex = -1
  iframe.setAttribute('sandbox', 'allow-downloads')
  iframe.addEventListener('error', reportError)
  document.body.appendChild(iframe)
  iframe.src = file.url
  window.setTimeout(() => iframe.remove(), IFRAME_GRACE_MS)
}

export function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export function downloadTextFile(
  fileName: string,
  contents: string,
  mimeType: string
): void {
  downloadBlob(fileName, new Blob([contents], { type: mimeType }))
}

let domScheduler: DownloadScheduler | null = null

export function downloadAll(
  files: readonly DownloadFile[],
  callbacks: DownloadRunCallbacks = {}
): () => void {
  domScheduler ??= createDownloadScheduler({
    navigate: navigateViaIframe,
    setTimer: (callback, delayMs) => window.setTimeout(callback, delayMs),
    clearTimer: id => window.clearTimeout(id),
  })
  domScheduler.run(files, callbacks)
  return () => domScheduler?.cancel()
}

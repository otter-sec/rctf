// Serialized multi-file downloading. Each file is fetched by pointing a fresh
// hidden, download-sandboxed iframe at its URL, spaced apart so browsers treat
// the batch as one user-driven action instead of a popup storm. No fetch, no
// `target=_blank`, no reliance on the `download` attribute (which cross-origin
// responses ignore).
//
// The scheduling/cancellation logic is a pure, injectable scheduler so it can be
// tested without a DOM; `downloadAll` is the thin browser wrapper around it.

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
  // Bumped on every run/cancel; a superseded queue's timers and late iframe
  // error reports check it and become no-ops.
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
  // Only `allow-downloads`: the frame can trigger the download but cannot run
  // scripts, read cookies, or navigate the top window.
  iframe.setAttribute('sandbox', 'allow-downloads')
  // Best-effort only. A cross-origin download response is opaque, so `error`
  // almost never fires; most failures cannot be observed from here.
  iframe.addEventListener('error', reportError)
  document.body.appendChild(iframe)
  iframe.src = file.url
  // Keep the frame long enough for a slow download to start, then reap it.
  window.setTimeout(() => iframe.remove(), IFRAME_GRACE_MS)
}

let domScheduler: DownloadScheduler | null = null

/**
 * Download every file in sequence via hidden download-sandboxed iframes.
 *
 * Reuses a single module-level scheduler so a second call supersedes the first,
 * cancelling any files it had not yet started.
 *
 * @returns A cancel function that drops the remaining queue.
 */
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

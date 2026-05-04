import katexStylesheetUrl from 'katex/dist/katex.min.css?url'

let lifecycleReady = false

function hasKatexMarkup(): boolean {
  return Boolean(document.querySelector('.katex'))
}

function hasKatexStylesheet(): boolean {
  return Boolean(document.querySelector('link[data-katex-stylesheet]'))
}

function ensureKatexStyles(): void {
  if (!hasKatexMarkup() || hasKatexStylesheet()) return

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = katexStylesheetUrl
  link.dataset.katexStylesheet = 'true'
  document.head.appendChild(link)
}

export function mountKatexStyles(): void {
  ensureKatexStyles()

  if (lifecycleReady) return
  lifecycleReady = true

  document.addEventListener('astro:page-load', ensureKatexStyles)
  document.addEventListener('astro:after-swap', ensureKatexStyles)
}

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

  // Keep KaTeX CSS out of the server-rendered layout. Astro Erudite hit
  // duplicate <head>/<html> output when this stylesheet was injected there:
  // https://github.com/jktrn/astro-erudite/pull/50
  // https://github.com/jktrn/astro-erudite/issues/49
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

import { mountClientModule } from './lifecycle'

function hasKatexMarkup(): boolean {
  return Boolean(document.querySelector('.katex'))
}

function hasKatexStylesheet(): boolean {
  return Boolean(document.querySelector('link[data-katex-stylesheet]'))
}

async function ensureKatexStyles(): Promise<void> {
  if (!hasKatexMarkup() || hasKatexStylesheet()) return

  // The katex package ships as a transitive dep of rehype-katex; importing
  // its CSS as a Vite URL keeps version-locking automatic and avoids any
  // CDN dependency.
  const { default: href } = await import('katex/dist/katex.min.css?url')
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  link.dataset.katexStylesheet = 'true'
  document.head.appendChild(link)
}

export const mountKatexStyles = mountClientModule({
  setup: () => void ensureKatexStyles(),
})

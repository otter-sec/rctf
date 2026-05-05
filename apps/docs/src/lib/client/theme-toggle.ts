let controller: AbortController | null = null
let lifecycleReady = false

const THEME_STORAGE_KEY = 'theme'

function readStoredTheme(): 'light' | 'dark' {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function saveTheme(theme: 'light' | 'dark'): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {}
}

function toggleTheme(): void {
  const element = document.documentElement
  const currentTheme = element.getAttribute('data-theme')
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark'

  element.classList.add('[&_*]:transition-none')
  element.setAttribute('data-theme', newTheme)
  window.getComputedStyle(element).getPropertyValue('opacity')

  requestAnimationFrame(() => {
    element.classList.remove('[&_*]:transition-none')
  })

  saveTheme(newTheme)
}

function initThemeToggle(): void {
  controller?.abort()
  controller = new AbortController()
  const { signal } = controller

  document
    .querySelectorAll<HTMLButtonElement>('[data-theme-toggle]')
    .forEach(button =>
      button.addEventListener('click', toggleTheme, { signal })
    )
}

function beforeSwap(event: Event): void {
  controller?.abort()

  const { newDocument } = event as Event & { newDocument: Document }
  newDocument.documentElement.setAttribute('data-theme', readStoredTheme())
}

export function mountThemeToggle(): void {
  initThemeToggle()

  if (lifecycleReady) return
  lifecycleReady = true

  document.addEventListener('astro:before-swap', beforeSwap)
  document.addEventListener('astro:after-swap', initThemeToggle)
}

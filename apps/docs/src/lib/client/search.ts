type PagefindResult = {
  id: string
  data: () => Promise<PagefindData>
}

type PagefindData = {
  url: string
  raw_url?: string
  meta: { title?: string; image?: string }
  excerpt: string
  sub_results?: Array<{
    title: string
    url: string
    excerpt: string
  }>
}

type Pagefind = {
  search: (query: string) => Promise<{ results: PagefindResult[] }>
  init?: () => Promise<void>
}

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, '')
const PAGEFIND_URL = `${BASE_PATH}/pagefind/pagefind.js`
const EMPTY_STATE_CLASS = 'text-muted-foreground px-3 py-8 text-center text-sm'

let pagefindPromise: Promise<Pagefind | null> | null = null
let searchRequestId = 0
let searchController: AbortController | null = null
let lifecycleReady = false

async function loadPagefind(): Promise<Pagefind | null> {
  if (pagefindPromise) return pagefindPromise

  pagefindPromise = (async () => {
    try {
      // Pagefind writes this module into dist/pagefind after Astro builds,
      // so Vite cannot resolve it as a static source import.
      const mod = await import(/* @vite-ignore */ PAGEFIND_URL)
      if (mod.init) await mod.init()
      return mod as Pagefind
    } catch {
      return null
    }
  })()

  return pagefindPromise
}

function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  ms: number,
): (...args: Args) => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: Args) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
}

function appendHighlightedExcerpt(container: HTMLElement, excerpt: string): void {
  const markRe = /<\/?mark>/gi
  let cursor = 0
  let mark: HTMLElement | null = null

  for (const match of excerpt.matchAll(markRe)) {
    const matchIndex = match.index ?? 0
    const text = excerpt.slice(cursor, matchIndex)
    if (text) (mark ?? container).append(document.createTextNode(text))

    if (match[0].toLowerCase() === '<mark>') {
      mark = document.createElement('mark')
      mark.className = 'bg-foreground/10 text-foreground rounded px-0.5'
      container.append(mark)
    } else {
      mark = null
    }

    cursor = matchIndex + match[0].length
  }

  const text = excerpt.slice(cursor)
  if (text) (mark ?? container).append(document.createTextNode(text))
}

function renderStatus(message: string): HTMLParagraphElement {
  const p = document.createElement('p')
  p.id = 'search-empty'
  p.className = EMPTY_STATE_CLASS
  p.textContent = message
  return p
}

function resultItem(data: PagefindData, index: number): HTMLLIElement {
  const li = document.createElement('li')
  const a = document.createElement('a')
  a.href = data.url
  a.className =
    'hover:bg-muted focus:bg-muted flex flex-col gap-1 rounded-md px-3 py-2 no-underline outline-none'
  a.dataset.searchResult = String(index)

  const title = document.createElement('span')
  title.className = 'text-foreground text-sm font-medium'
  title.textContent = data.meta.title ?? 'Untitled'

  const excerpt = document.createElement('span')
  excerpt.className = 'text-muted-foreground text-xs leading-relaxed'
  appendHighlightedExcerpt(excerpt, data.excerpt)

  a.append(title, excerpt)
  li.append(a)
  return li
}

async function runSearch(query: string): Promise<void> {
  const requestId = ++searchRequestId
  const results = document.getElementById('search-results')
  if (!results) return

  const trimmedQuery = query.trim()
  if (!trimmedQuery) {
    results.removeAttribute('aria-busy')
    results.replaceChildren(renderStatus('Start typing to search the docs.'))
    return
  }

  results.setAttribute('aria-busy', 'true')
  if (!results.querySelector('[data-search-result]')) {
    results.replaceChildren(renderStatus('Searching...'))
  }

  const pagefind = await loadPagefind()
  if (requestId !== searchRequestId) return

  if (!pagefind) {
    results.removeAttribute('aria-busy')
    results.replaceChildren(
      renderStatus('Search index not available. Run `bun run build` to generate it.'),
    )
    return
  }

  try {
    const { results: found } = await pagefind.search(trimmedQuery)
    if (requestId !== searchRequestId) return

    const top = await Promise.all(found.slice(0, 8).map((result) => result.data()))
    if (requestId !== searchRequestId) return

    if (top.length === 0) {
      results.removeAttribute('aria-busy')
      results.replaceChildren(renderStatus('No results found.'))
      return
    }

    const list = document.createElement('ul')
    list.className = 'flex flex-col gap-1'
    list.append(...top.map(resultItem))

    results.removeAttribute('aria-busy')
    results.replaceChildren(list)
  } catch {
    if (requestId !== searchRequestId) return
    results.removeAttribute('aria-busy')
    results.replaceChildren(renderStatus('Search failed. Try again.'))
  }
}

const debouncedSearch = debounce(runSearch, 120)

function setupSearch(): void {
  const dialog = document.getElementById('search-dialog') as HTMLDialogElement | null
  const triggers = document.querySelectorAll<HTMLButtonElement>('[data-search-trigger]')
  const input = document.getElementById('search-input') as HTMLInputElement | null

  if (!dialog || !input) return

  searchController?.abort()
  searchController = new AbortController()
  const { signal } = searchController

  const open = () => {
    if (!dialog.open) dialog.showModal()
    setTimeout(() => input.focus(), 20)
  }

  const close = () => {
    if (dialog.open) dialog.close()
  }

  triggers.forEach((trigger) => trigger.addEventListener('click', open, { signal }))
  input.addEventListener('input', () => debouncedSearch(input.value), { signal })
  dialog.addEventListener('submit', (event) => event.preventDefault(), { signal })

  dialog.addEventListener(
    'click',
    (event) => {
      const target = event.target
      if (target instanceof Element && target.closest('a[href]')) close()
      if (event.target === dialog) close()
    },
    { signal },
  )

  document.addEventListener(
    'keydown',
    (event) => {
      const isHotkey = event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)

      if (isHotkey) {
        event.preventDefault()
        dialog.open ? close() : open()
      }

      if (event.key === 'Escape' && dialog.open) {
        event.preventDefault()
        close()
      }

      if (!dialog.open) return

      const searchResults = dialog.querySelectorAll<HTMLAnchorElement>('[data-search-result]')
      if (searchResults.length === 0) return

      const active = dialog.querySelector<HTMLAnchorElement>('[data-search-result]:focus')
      const index = active ? Array.from(searchResults).indexOf(active) : -1

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        const next = searchResults[Math.min(searchResults.length - 1, index + 1)]
        next?.focus()
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        if (index <= 0) input.focus()
        else searchResults[index - 1].focus()
      }
    },
    { signal },
  )
}

export function mountDocsSearch(): void {
  setupSearch()

  if (lifecycleReady) return
  lifecycleReady = true

  document.addEventListener('astro:before-swap', () => searchController?.abort())
  document.addEventListener('astro:after-swap', setupSearch)
}

import { mountClientModule } from './lifecycle'

const INLINE_SHELL_SELECTOR = '.inline-shell-cmd'
const COPY_FEEDBACK_MS = 1200

async function copyCommand(button: HTMLElement): Promise<void> {
  if (button.dataset.copying === '1') return

  const command = button.getAttribute('data-copy')
  if (!command) return

  try {
    await navigator.clipboard.writeText(command)
  } catch {
    return
  }

  button.dataset.copying = '1'
  const prompt = button.querySelector<HTMLSpanElement>('.shell-prompt')
  const originalPrompt = prompt?.textContent ?? '$'

  if (prompt) prompt.textContent = '✓'
  button.classList.add('copied')

  window.setTimeout(() => {
    if (prompt) prompt.textContent = originalPrompt
    button.classList.remove('copied')
    delete button.dataset.copying
  }, COPY_FEEDBACK_MS)
}

function shellCommandFromEvent(event: Event): HTMLElement | null {
  const target = event.target instanceof HTMLElement ? event.target : null
  return target?.closest<HTMLElement>(INLINE_SHELL_SELECTOR) ?? null
}

function handleClick(event: MouseEvent): void {
  const button = shellCommandFromEvent(event)
  if (button) void copyCommand(button)
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key !== 'Enter' && event.key !== ' ') return

  const button = shellCommandFromEvent(event)
  if (!button) return

  event.preventDefault()
  void copyCommand(button)
}

// Delegated click/keydown listeners on `document` survive CSN navigations,
// so there's nothing to set up per page.
export const mountInlineShellCopy = mountClientModule({
  setup: () => {},
  initOnce: () => {
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleKeydown)
  },
})

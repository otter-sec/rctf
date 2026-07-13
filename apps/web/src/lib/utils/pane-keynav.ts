const ARROW_CONSUMERS = [
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[role="separator"]',
  '[role="tab"]',
  '[role="tablist"]',
  '[role="menu"]',
  '[role="listbox"]',
  '[role="tree"]',
  '[role="combobox"]',
  '[role="slider"]',
].join(', ')

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'

export function handlePaneArrowKey(event: KeyboardEvent): void {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  if (
    event.defaultPrevented ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  )
    return
  const target = event.target instanceof Element ? event.target : null
  if (target?.closest(ARROW_CONSUMERS)) return
  const shell = event.currentTarget as HTMLElement
  const side = event.key === 'ArrowLeft' ? 'list' : 'detail'
  const pane = shell.querySelector(`pane-surface[data-side='${side}']`)
  if (!pane || (target && pane.contains(target))) return
  const focusTarget =
    pane.querySelector<HTMLElement>('button[data-selected]') ??
    pane.querySelector<HTMLElement>(FOCUSABLE)
  if (!focusTarget) return
  event.preventDefault()
  focusTarget.focus()
}

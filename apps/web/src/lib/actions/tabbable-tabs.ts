const TAB_SELECTOR = '[role="tab"]'
const TAB_PANEL_SELECTOR = '[role="tabpanel"]'

function isDisabledTab(tab: HTMLElement) {
  return (
    tab.getAttribute('aria-disabled') === 'true' ||
    (tab instanceof HTMLButtonElement && tab.disabled)
  )
}

function syncTabbableTabs(node: HTMLElement) {
  for (const tab of node.querySelectorAll<HTMLElement>(TAB_SELECTOR)) {
    if (isDisabledTab(tab)) continue
    if (tab.getAttribute('tabindex') !== '0') tab.setAttribute('tabindex', '0')
  }
}

function syncUntabbableTabPanels(node: HTMLElement) {
  for (const panel of node.querySelectorAll<HTMLElement>(TAB_PANEL_SELECTOR)) {
    if (panel.getAttribute('tabindex') !== '-1')
      panel.setAttribute('tabindex', '-1')
  }
}

export function tabbableTabs(node: HTMLElement) {
  syncTabbableTabs(node)

  const observer = new MutationObserver(() => syncTabbableTabs(node))

  observer.observe(node, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['aria-disabled', 'disabled', 'tabindex'],
  })

  return {
    destroy() {
      observer.disconnect()
    },
  }
}

export function untabbableTabPanels(node: HTMLElement) {
  syncUntabbableTabPanels(node)

  const observer = new MutationObserver(() => syncUntabbableTabPanels(node))

  observer.observe(node, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['tabindex'],
  })

  return {
    destroy() {
      observer.disconnect()
    },
  }
}

import type { Attachment } from 'svelte/attachments'

/**
 * Fades the clipped edges of a scrollable element. Applies `data-scroll-fade`
 * so the global mask in `src/styles/scroll-fade.css` takes effect, then keeps
 * `data-fade-top` / `data-fade-bottom` in sync with the scroll position — JS
 * only toggles attributes; the CSS renders the fades.
 */
export const scrollFade: Attachment<HTMLElement> = node => {
  const update = () => {
    const max = node.scrollHeight - node.clientHeight
    node.toggleAttribute('data-fade-top', node.scrollTop > 1)
    node.toggleAttribute('data-fade-bottom', node.scrollTop < max - 1)
  }

  // Observing the children too catches content growth (e.g. an infinite list
  // appending a page) that changes scrollHeight without resizing node itself.
  const observer = new ResizeObserver(update)
  observer.observe(node)
  for (const child of node.children) observer.observe(child)

  node.setAttribute('data-scroll-fade', '')
  update()
  node.addEventListener('scroll', update, { passive: true })

  return () => {
    observer.disconnect()
    node.removeEventListener('scroll', update)
    node.removeAttribute('data-scroll-fade')
    node.removeAttribute('data-fade-top')
    node.removeAttribute('data-fade-bottom')
  }
}

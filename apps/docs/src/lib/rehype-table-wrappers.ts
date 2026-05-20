import type { Root } from 'hast'
import { hasClass, isElement, replaceChild, visitHtml } from './html-tree'

export function rehypeTableWrappers() {
  return (tree: Root) => {
    visitHtml(tree, (node, index, parent) => {
      if (!isElement(node)) return
      if (node.tagName !== 'table' || !parent || index === undefined) return
      if (isElement(parent) && parent.tagName === 'div' && hasClass(parent, 'table-wrapper')) return

      replaceChild(parent, index, {
        type: 'element',
        tagName: 'div',
        properties: { className: ['table-wrapper'] },
        children: [node],
      })
      return 'skip'
    })
  }
}

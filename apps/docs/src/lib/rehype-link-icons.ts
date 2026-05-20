import type { ElementContent, Root } from 'hast'
import { hasClass, isElement, visitHtml } from './html-tree'

export function rehypeLinkIcons() {
  return (tree: Root) => {
    visitHtml(tree, (node, index, parent) => {
      if (!isElement(node)) return

      if (node.tagName === 'pre') return 'skip'
      if (hasClass(node, 'link-icon')) return 'skip'
      if (node.tagName !== 'a') return
      if (hasClass(node, 'heading-anchor')) return 'skip'
      if (typeof node.properties.href !== 'string' || node.properties.href.length === 0) return
      if (!parent || index === undefined) return

      const siblings = parent.children as ElementContent[]
      const next = siblings[index + 1]
      if (next && isElement(next) && hasClass(next, 'link-icon')) return 'skip'

      siblings.splice(index + 1, 0, {
        type: 'element',
        tagName: 'svg',
        properties: {
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
          className: ['link-icon'],
        },
        children: [
          {
            type: 'element',
            tagName: 'path',
            properties: { d: 'M9 15l6 -6' },
            children: [],
          },
          {
            type: 'element',
            tagName: 'path',
            properties: { d: 'M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464' },
            children: [],
          },
          {
            type: 'element',
            tagName: 'path',
            properties: {
              d: 'M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463',
            },
            children: [],
          },
        ],
      })
      return 'skip'
    })
  }
}

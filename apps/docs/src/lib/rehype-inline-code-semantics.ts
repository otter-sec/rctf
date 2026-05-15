import type { Element, ElementContent, Root } from 'hast'
import { parseCodeSemantics } from './code-semantics'
import { getNodeText, hasClass, isElement, visitHast } from './hast-utils'

function addClass(node: Element, className: string): void {
  const classes = node.properties.className
  const arr = Array.isArray(classes) ? classes.map(String) : []
  if (!arr.includes(className)) arr.push(className)
  node.properties.className = arr
}

function decorate(node: Element, children: ElementContent[]): void {
  addClass(node, 'inline-code-enhanced')
  addClass(node, 'inline-code-with-tones')
  node.children = children
}

export function rehypeInlineCodeSemantics() {
  return (tree: Root) => {
    visitHast(tree, (node, parent) => {
      if (!isElement(node)) return
      if (node.tagName === 'pre') return 'skip'
      if (node.tagName !== 'code') return
      if (hasClass(node, 'inline-code-enhanced')) return 'skip'
      if (parent && isElement(parent) && parent.tagName === 'pre') return 'skip'
      if (parent && isElement(parent) && hasClass(parent, 'shiki')) return 'skip'

      const children = parseCodeSemantics(getNodeText(node))
      if (children) decorate(node, children)
      return 'skip'
    })
  }
}

import { toHtml } from 'hast-util-to-html'
import { routeCodeNode, textNode } from './code-semantics'

export function renderTocHeading(value: string): string {
  const routeNode = routeCodeNode(value)
  const children = routeNode ? [routeNode] : [textNode(value)]

  return toHtml({ type: 'root', children })
}

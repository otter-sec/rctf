import type { Element, Properties, Root, Text } from 'hast'
import { parseCodeSemantics, stripCodeTags } from './code-semantics'
import { findElementChild, getNodeText, hasClass, isElement, visitHast } from './hast-utils'

const PREFIX = '$ '
const LONG_PILL = 24

function firstTextNode(node: Element): Text | null {
  for (const child of node.children) {
    if (child.type === 'text') return child
    if (child.type === 'element') {
      const found = firstTextNode(child)
      if (found) return found
    }
  }
  return null
}

function buttonProperties(cmd: string): Properties {
  const copyText = stripCodeTags(cmd)
  const properties: Properties = {
    role: 'button',
    tabIndex: 0,
    className: ['inline-shell-cmd'],
    'data-copy': copyText,
    'aria-label': `Copy command: ${copyText}`,
    title: `Copy: ${copyText}`,
  }
  if (copyText.length > LONG_PILL) properties['data-long-pill'] = 'true'
  return properties
}

function promptNode(): Element {
  return {
    type: 'element',
    tagName: 'span',
    properties: { className: ['shell-prompt'], 'aria-hidden': 'true' },
    children: [{ type: 'text', value: '$' }],
  }
}

function cloneCodeElement(codeNode: Element): Element {
  return {
    ...codeNode,
    properties: { ...codeNode.properties },
    children: [...codeNode.children],
  }
}

function applyCodeSemantics(codeNode: Element): void {
  const children = parseCodeSemantics(getNodeText(codeNode))
  if (children) codeNode.children = children
}

function convertElementToButton(node: Element, codeNode: Element, cmd: string): void {
  node.tagName = 'span'
  node.properties = buttonProperties(cmd)
  node.children = [promptNode(), codeNode]
}

function tryConvertShikiSpan(node: Element): boolean {
  const codeChild = findElementChild(node, 'code')
  if (!codeChild) return false

  const first = firstTextNode(codeChild)
  if (!first || !first.value.startsWith(PREFIX)) return false

  const cmd = getNodeText(codeChild).slice(PREFIX.length)
  if (cmd.length === 0) return false

  first.value = first.value.slice(PREFIX.length)
  applyCodeSemantics(codeChild)
  convertElementToButton(node, codeChild, cmd)
  return true
}

function tryConvertPlainCode(node: Element): boolean {
  const first = firstTextNode(node)
  if (!first || !first.value.startsWith(PREFIX)) return false

  const cmd = getNodeText(node).slice(PREFIX.length)
  if (cmd.length === 0) return false

  first.value = first.value.slice(PREFIX.length)
  const codeNode = cloneCodeElement(node)
  applyCodeSemantics(codeNode)
  convertElementToButton(node, codeNode, cmd)
  return true
}

export function rehypeInlineShellCmd() {
  return (tree: Root) => {
    visitHast(tree, node => {
      if (!isElement(node)) return

      // Block code: skip the whole subtree (handled by ec-shell-prompt).
      if (node.tagName === 'pre') return 'skip'
      // Idempotency: don't re-wrap.
      if (hasClass(node, 'inline-shell-cmd')) return 'skip'

      if (node.tagName === 'span' && hasClass(node, 'shiki')) {
        if (tryConvertShikiSpan(node)) return 'skip'
      } else if (node.tagName === 'code') {
        if (tryConvertPlainCode(node)) return 'skip'
      }
    })
  }
}

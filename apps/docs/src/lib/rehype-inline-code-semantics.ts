import type { Element, ElementContent, Properties, Root, Text } from 'hast'
import { getNodeText, hasClass, isElement, visitHast } from './hast-utils'

const TONE_TAG_RE =
  /<\/?(black|red|green|orange|yellow|blue|magenta|cyan|white|gray|grey|muted|dim)>/g

const TONE_ALIASES: Record<string, string> = {
  dim: 'black',
  gray: 'black',
  grey: 'black',
  muted: 'black',
  yellow: 'orange',
}

interface ToneFrame {
  tag: string | null
  children: ElementContent[]
}

function text(value: string): Text {
  return { type: 'text', value }
}

function span(
  className: string[],
  children: ElementContent[],
  properties: Properties = {}
): Element {
  return {
    type: 'element',
    tagName: 'span',
    properties: { ...properties, className },
    children,
  }
}

function normalizeTone(tag: string): string {
  return TONE_ALIASES[tag] ?? tag
}

function toneNode(tag: string, children: ElementContent[]): Element {
  const tone = normalizeTone(tag)
  return span(['inline-code-tone', `is-${tone}`], children)
}

function parseToneTags(value: string): ElementContent[] | null {
  const stack: ToneFrame[] = [{ tag: null, children: [] }]
  let lastIndex = 0
  let sawTag = false

  for (const match of value.matchAll(TONE_TAG_RE)) {
    const token = match[0]
    const tag = match[1]
    const index = match.index ?? 0
    const current = stack[stack.length - 1]
    if (!current || !tag) return null

    if (index > lastIndex) current.children.push(text(value.slice(lastIndex, index)))
    sawTag = true

    if (token.startsWith('</')) {
      const frame = stack.pop()
      if (!frame || frame.tag !== tag) return null
      const parent = stack[stack.length - 1]
      if (!parent) return null
      parent.children.push(toneNode(tag, frame.children))
    } else {
      stack.push({ tag, children: [] })
    }

    lastIndex = index + token.length
  }

  if (!sawTag || stack.length !== 1) return null
  if (lastIndex < value.length) stack[0].children.push(text(value.slice(lastIndex)))

  return stack[0].children
}

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

function maybeDecorateCode(node: Element): void {
  const toneChildren = parseToneTags(getNodeText(node))
  if (toneChildren) {
    decorate(node, toneChildren)
  }
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

      maybeDecorateCode(node)
      return 'skip'
    })
  }
}

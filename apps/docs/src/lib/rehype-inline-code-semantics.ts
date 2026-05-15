import type { Element, ElementContent, Properties, Root, Text } from 'hast'
import { getNodeText, hasClass, isElement, visitHast } from './hast-utils'

const INLINE_TAG_RE =
  /<\/?(route|black|red|green|orange|yellow|blue|magenta|cyan|white|gray|grey|muted|dim)>/g

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const
const METHOD_PATTERN = METHODS.join('|')
const METHOD_GROUP_RE = new RegExp(`^(?:${METHOD_PATTERN})(?:/(?:${METHOD_PATTERN}))*$`)
const ROUTE_RE = new RegExp(`^((?:${METHOD_PATTERN})(?:/(?:${METHOD_PATTERN}))*)\\s+(.+)$`)

const METHOD_TONES: Record<string, string> = {
  GET: 'cyan',
  POST: 'green',
  PUT: 'magenta',
  PATCH: 'orange',
  DELETE: 'red',
  HEAD: 'blue',
  OPTIONS: 'blue',
}

const TONE_ALIASES: Record<string, string> = {
  dim: 'black',
  gray: 'black',
  grey: 'black',
  muted: 'black',
  yellow: 'orange',
}

interface InlineFrame {
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

function methodNodes(methods: string): ElementContent[] {
  return methods.split('/').flatMap((method, index) => {
    const nodes: ElementContent[] = []
    if (index > 0) nodes.push(text('/'))
    nodes.push(toneNode(METHOD_TONES[method] ?? 'white', [text(method)]))
    return nodes
  })
}

function routePathNodes(path: string): ElementContent[] {
  const nodes: ElementContent[] = []
  let remaining = path

  if (remaining === '/api') {
    return [toneNode('black', [text(remaining)])]
  }

  if (remaining.startsWith('/api/')) {
    nodes.push(toneNode('black', [text('/api/')]))
    remaining = remaining.slice('/api/'.length)
  } else if (remaining.startsWith('/api#')) {
    nodes.push(toneNode('black', [text('/api')]))
    remaining = remaining.slice('/api'.length)
  } else if (remaining.startsWith('/')) {
    nodes.push(toneNode('black', [text('/')]))
    remaining = remaining.slice(1)
  }

  for (const [index, segment] of remaining.split('/').entries()) {
    if (index > 0) nodes.push(toneNode('black', [text('/')]))
    if (segment) nodes.push(text(segment))
  }

  return nodes
}

function routeChildren(value: string): ElementContent[] {
  const route = value.trim()
  if (METHOD_GROUP_RE.test(route)) return methodNodes(route)

  const endpoint = route.match(ROUTE_RE)
  if (endpoint) {
    return [...methodNodes(endpoint[1] ?? ''), text(' '), ...routePathNodes(endpoint[2] ?? '')]
  }

  if (route.startsWith('/')) {
    return routePathNodes(route)
  }

  return [text(value)]
}

function contentText(children: ElementContent[]): string {
  return children
    .map(child => {
      if (child.type === 'text') return child.value
      if (child.type === 'element') return contentText(child.children)
      return ''
    })
    .join('')
}

function taggedNode(tag: string, children: ElementContent[]): Element {
  if (tag === 'route') {
    return span(['inline-code-route'], routeChildren(contentText(children)))
  }

  return toneNode(tag, children)
}

function parseInlineCodeTags(value: string): ElementContent[] | null {
  const stack: InlineFrame[] = [{ tag: null, children: [] }]
  let lastIndex = 0
  let sawTag = false

  for (const match of value.matchAll(INLINE_TAG_RE)) {
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
      parent.children.push(taggedNode(tag, frame.children))
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
  const children = parseInlineCodeTags(getNodeText(node))
  if (children) {
    decorate(node, children)
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

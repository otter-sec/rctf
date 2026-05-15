import type { Element, ElementContent, Properties, Text } from 'hast'

const TONE_TAGS = [
  'black',
  'red',
  'green',
  'orange',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'gray',
  'grey',
  'muted',
  'dim',
  'dimmed',
] as const
type ToneTag = (typeof TONE_TAGS)[number]

const ROUTE_TAG = 'route'

const TONE_ALIASES = new Map<string, ToneTag>([
  ['dim', 'black'],
  ['dimmed', 'black'],
  ['gray', 'black'],
  ['grey', 'black'],
  ['muted', 'black'],
  ['yellow', 'orange'],
])

const tagRegex = (tags: readonly string[]) => new RegExp(`<\\/?(${tags.join('|')})>`, 'g')
const CODE_TAG_RE = tagRegex([ROUTE_TAG, ...TONE_TAGS])
const CODE_TONE_TAG_RE = tagRegex(TONE_TAGS)

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const
type Method = (typeof METHODS)[number]

const METHOD_TONES = new Map<string, ToneTag>([
  ['GET', 'cyan'],
  ['POST', 'green'],
  ['PUT', 'magenta'],
  ['PATCH', 'orange'],
  ['DELETE', 'red'],
  ['HEAD', 'blue'],
  ['OPTIONS', 'blue'],
] satisfies [Method, ToneTag][])

const METHOD_PATTERN = METHODS.join('|')
const METHOD_GROUP_RE = new RegExp(`^(?:${METHOD_PATTERN})(?:/(?:${METHOD_PATTERN}))*$`)
const ROUTE_RE = new RegExp(`^((?:${METHOD_PATTERN})(?:/(?:${METHOD_PATTERN}))*)\\s+(.+)$`)

export function textNode(value: string): Text {
  return { type: 'text', value }
}

function spanNode(
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
  return TONE_ALIASES.get(tag) ?? tag
}

export function toneClassNames(tag: string): string[] {
  return ['inline-code-tone', `is-${normalizeTone(tag)}`]
}

function toneNode(tag: string, children: ElementContent[]): Element {
  return spanNode(toneClassNames(tag), children)
}

function methodNodes(methods: string): ElementContent[] {
  return methods.split('/').flatMap((method, i) => {
    const node = toneNode(METHOD_TONES.get(method) ?? 'white', [textNode(method)])
    return i === 0 ? [node] : [textNode('/'), node]
  })
}

function routePathNodes(path: string): ElementContent[] {
  let prefix = ''
  let rest = path
  if (path === '/api' || path.startsWith('/api/') || path.startsWith('/api#')) {
    prefix = path.startsWith('/api/') ? '/api/' : '/api'
    rest = path.slice(prefix.length)
  } else if (path.startsWith('/')) {
    prefix = '/'
    rest = path.slice(1)
  }

  const nodes: ElementContent[] = []
  if (prefix) nodes.push(toneNode('black', [textNode(prefix)]))
  for (const [i, segment] of rest.split('/').entries()) {
    if (i > 0) nodes.push(toneNode('black', [textNode('/')]))
    if (segment) nodes.push(textNode(segment))
  }
  return nodes
}

function routeChildren(value: string): ElementContent[] {
  const route = value.trim()
  if (METHOD_GROUP_RE.test(route)) return methodNodes(route)

  const endpoint = route.match(ROUTE_RE)
  if (endpoint)
    return [...methodNodes(endpoint[1]!), textNode(' '), ...routePathNodes(endpoint[2]!)]

  if (route.startsWith('/')) return routePathNodes(route)
  return [textNode(value)]
}

function isRouteText(value: string): boolean {
  const route = value.trim()
  return METHOD_GROUP_RE.test(route) || ROUTE_RE.test(route) || route.startsWith('/')
}

export function routeCodeNode(value: string): Element | null {
  if (!isRouteText(value)) return null
  return {
    type: 'element',
    tagName: 'code',
    properties: { className: ['inline-code-enhanced', 'inline-code-with-tones'] },
    children: [spanNode(['inline-code-route'], routeChildren(value))],
  }
}

export function stripCodeTags(value: string): string {
  return value.replace(CODE_TAG_RE, '')
}

interface ParsedText {
  type: 'text'
  value: string
}

interface ParsedTag {
  type: 'tag'
  tag: string
  start: number
  end: number
  children: ParsedNode[]
}

type ParsedNode = ParsedText | ParsedTag

interface ParsedTree {
  text: string
  children: ParsedNode[]
}

interface Frame {
  tag: string | null
  start: number
  children: ParsedNode[]
}

function parseTagTree(input: string, re: RegExp): ParsedTree | null {
  const root: Frame = { tag: null, start: 0, children: [] }
  const stack: Frame[] = [root]
  let text = ''
  let lastIndex = 0
  let sawTag = false

  const pushText = (value: string): void => {
    if (!value) return
    stack[stack.length - 1]!.children.push({ type: 'text', value })
    text += value
  }

  for (const match of input.matchAll(re)) {
    const token = match[0]
    const tag = match[1]
    if (!tag) return null
    const index = match.index ?? 0

    pushText(input.slice(lastIndex, index))
    sawTag = true
    lastIndex = index + token.length

    if (token.startsWith('</')) {
      const frame = stack.pop()
      if (!frame || frame.tag !== tag) return null
      stack[stack.length - 1]!.children.push({
        type: 'tag',
        tag,
        start: frame.start,
        end: text.length,
        children: frame.children,
      })
    } else {
      stack.push({ tag, start: text.length, children: [] })
    }
  }

  if (!sawTag || stack.length !== 1) return null
  pushText(input.slice(lastIndex))
  return { text, children: root.children }
}

function flatText(nodes: ParsedNode[]): string {
  return nodes.map(n => (n.type === 'text' ? n.value : flatText(n.children))).join('')
}

function renderNodes(nodes: ParsedNode[]): ElementContent[] {
  return nodes.map(node => {
    if (node.type === 'text') return textNode(node.value)
    if (node.tag === ROUTE_TAG) {
      return spanNode(['inline-code-route'], routeChildren(flatText(node.children)))
    }
    return toneNode(node.tag, renderNodes(node.children))
  })
}

export function parseCodeSemantics(value: string): ElementContent[] | null {
  const parsed = parseTagTree(value, CODE_TAG_RE)
  return parsed && renderNodes(parsed.children)
}

export interface CodeToneRange {
  tone: string
  start: number
  end: number
}

export interface ParsedCodeTones {
  text: string
  ranges: CodeToneRange[]
}

export function parseCodeToneRanges(value: string): ParsedCodeTones | null {
  const parsed = parseTagTree(value, CODE_TONE_TAG_RE)
  if (!parsed) return null

  const ranges: CodeToneRange[] = []
  const walk = (nodes: ParsedNode[]): void => {
    for (const node of nodes) {
      if (node.type === 'text') continue
      if (node.start < node.end) {
        ranges.push({ tone: normalizeTone(node.tag), start: node.start, end: node.end })
      }
      walk(node.children)
    }
  }
  walk(parsed.children)
  return { text: parsed.text, ranges }
}

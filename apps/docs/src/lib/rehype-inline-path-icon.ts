import type { Element, ElementContent, Root } from 'hast'
import { findElementChild, hasClass, isElement, visitHast } from './hast-utils'

// Tabler icon paths (viewBox 0 0 24 24, stroke currentColor).
const FILE_PATHS = [
  'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
  'M14 2v4a2 2 0 0 0 2 2h4',
]
const FOLDER_PATHS = [
  'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z',
]

const PATH_HINT_RE = /\{:(dir|file)\}$/
const PATH_KIND_PROPERTY = 'data-inline-path-kind'

type InlinePathKind = 'file' | 'folder'

function normalizeHint(kind: string): InlinePathKind {
  return kind === 'dir' ? 'folder' : 'file'
}

function hintedKind(text: string): InlinePathKind | null {
  const hint = text.match(PATH_HINT_RE)?.[1]
  return hint ? normalizeHint(hint) : null
}

function stripHint(text: string): string {
  return text.replace(PATH_HINT_RE, '')
}

function setPathKind(node: Element, kind: InlinePathKind): void {
  node.properties[PATH_KIND_PROPERTY] = kind
}

function pathKind(node: Element): InlinePathKind | null {
  const kind = node.properties[PATH_KIND_PROPERTY]
  return kind === 'file' || kind === 'folder' ? kind : null
}

function stripInlinePathHint(node: Element): InlinePathKind | null {
  if (node.children.length !== 1) return null
  const child = node.children[0]
  if (!child || child.type !== 'text') return null

  const kind = hintedKind(child.value)
  if (!kind) return null

  child.value = stripHint(child.value)
  setPathKind(node, kind)
  return kind
}

function svgIcon(paths: string[], kind: InlinePathKind): Element {
  return {
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
      className: ['inline-path-icon', `is-${kind}`],
    },
    children: paths.map(d => ({
      type: 'element',
      tagName: 'path',
      properties: { d },
      children: [],
    })),
  }
}

function alreadyDecorated(node: Element): boolean {
  const first = node.children?.[0]
  return first?.type === 'element' && first.tagName === 'svg' && hasClass(first, 'inline-path-icon')
}

function decorate(codeNode: Element, kind: InlinePathKind): void {
  if (alreadyDecorated(codeNode)) return
  const icon = svgIcon(kind === 'folder' ? FOLDER_PATHS : FILE_PATHS, kind)
  codeNode.children.unshift(icon)
}

// Match <kebab-case>, <snake_case>, <lowercase> placeholders. Lowercase-start
// keeps Rust generics (`<T>`, `<NewAccount>`, `<Vec<u8>>`) from matching,
// while still catching the common `<service-name>` / `<your_account>` /
// `<filename>` shapes that appear in path strings.
const PLACEHOLDER_RE = /<[a-z][a-z0-9_-]*>/g

function dimPlaceholders(node: Element): void {
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i]
    if (!child) continue
    if (child.type === 'text') {
      const text = child.value
      const matches = [...text.matchAll(PLACEHOLDER_RE)]
      if (matches.length === 0) continue
      const replacements: ElementContent[] = []
      let lastIdx = 0
      for (const match of matches) {
        const start = match.index ?? 0
        if (start > lastIdx) {
          replacements.push({ type: 'text', value: text.slice(lastIdx, start) })
        }
        replacements.push({
          type: 'element',
          tagName: 'span',
          properties: { className: ['path-placeholder'] },
          children: [{ type: 'text', value: match[0] }],
        })
        lastIdx = start + match[0].length
      }
      if (lastIdx < text.length) {
        replacements.push({ type: 'text', value: text.slice(lastIdx) })
      }
      node.children.splice(i, 1, ...replacements)
      i += replacements.length - 1
    } else if (child.type === 'element') {
      dimPlaceholders(child)
    }
  }
}

export function rehypeInlinePathHints() {
  return (tree: Root) => {
    visitHast(tree, node => {
      if (!isElement(node)) return
      if (node.tagName === 'pre') return 'skip'
      if (node.tagName !== 'code') return

      stripInlinePathHint(node)
      return 'skip'
    })
  }
}

export function rehypeInlinePathIcon() {
  return (tree: Root) => {
    visitHast(tree, node => {
      if (!isElement(node)) return

      // Skip block code and our own command pills.
      if (node.tagName === 'pre') return 'skip'
      if (hasClass(node, 'inline-shell-cmd')) return 'skip'

      // Shiki-wrapped inline code: decorate the inner <code>, don't recurse in.
      if (node.tagName === 'span' && hasClass(node, 'shiki')) {
        const codeChild = findElementChild(node, 'code')
        if (codeChild) {
          const kind = pathKind(codeChild) ?? stripInlinePathHint(codeChild)
          if (kind) {
            dimPlaceholders(codeChild)
            decorate(codeChild, kind)
          }
        }
        return 'skip'
      }

      // Plain inline <code>.
      if (node.tagName === 'code') {
        const kind = pathKind(node) ?? stripInlinePathHint(node)
        if (kind) {
          dimPlaceholders(node)
          decorate(node, kind)
        }
        return 'skip'
      }
    })
  }
}

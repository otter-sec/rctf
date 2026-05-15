import type { Element, ElementContent, Root } from 'hast'
import { findElementChild, getNodeText, hasClass, isElement, visitHast } from './hast-utils'

// Tabler icon paths (viewBox 0 0 24 24, stroke currentColor).
const FILE_PATHS = [
  'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
  'M14 2v4a2 2 0 0 0 2 2h4',
]
const FOLDER_PATHS = [
  'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z',
]

const EXTENSIONS = [
  'toml',
  'rs',
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'json',
  'jsonc',
  'json5',
  'md',
  'mdx',
  'yaml',
  'yml',
  'lock',
  'txt',
  'sh',
  'bash',
  'zsh',
  'fish',
  'css',
  'scss',
  'html',
  'svg',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'gif',
  'env',
  'sol',
  'graphql',
  'gql',
  'sql',
  'xml',
  'astro',
  'vue',
  'svelte',
  'ini',
  'cfg',
]
const EXT_RE = new RegExp(`\\.(${EXTENSIONS.join('|')})$`, 'i')
const DOTFILE_RE =
  /^\.(gitignore|env|prettierrc|eslintrc|npmrc|yarnrc|nvmrc|editorconfig|gitkeep|gitattributes)/i
const ANSI_RE = /\x1b\[[0-9;]*m/g
const INLINE_LANG_RE = /\{:[A-Za-z0-9_-]+\}$/
const API_ROUTE_RE =
  /^\/(?:api(?:[/*#]|$)|(?:api\/)?v[12](?:\/|$)|now$|with-graph$|graph$)/
const ABSOLUTE_FS_RE =
  /^\/(?:etc|var|usr|opt|home|root|tmp|app|srv|mnt|workspace|Users)(?:\/|$)/

function classify(text: string): 'file' | 'folder' | null {
  const plainText = text.replace(ANSI_RE, '').replace(INLINE_LANG_RE, '')
  if (!text || text.length > 200) return null
  if (/\s/.test(plainText)) return null
  if (plainText.includes('://')) return null
  if (plainText.startsWith('@')) return null
  if (plainText.startsWith('-')) return null
  if (plainText.startsWith('$ ')) return null
  if (API_ROUTE_RE.test(plainText)) return null
  if (plainText.endsWith('/')) {
    if (plainText.startsWith('/') && !ABSOLUTE_FS_RE.test(plainText)) return null
    return 'folder'
  }
  // Require an explicit path signal: leading /, ./, or ../; multiple slashes;
  // a recognized file extension; or a known dotfile name. A single-slash
  // kebab token like `provider-name/feature-name` is NOT
  // a path even though it contains a slash.
  if (plainText.startsWith('/')) {
    if (ABSOLUTE_FS_RE.test(plainText) || EXT_RE.test(plainText)) return 'file'
    return null
  }
  if (plainText.startsWith('./') || plainText.startsWith('../')) {
    return 'file'
  }
  if ((plainText.match(/\//g) || []).length >= 2) return 'file'
  if (EXT_RE.test(plainText)) return 'file'
  if (DOTFILE_RE.test(plainText)) return 'file'
  return null
}

function svgIcon(paths: string[], kind: 'file' | 'folder'): Element {
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
    children: paths.map((d) => ({
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

function decorate(codeNode: Element, kind: 'file' | 'folder'): void {
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

export function rehypeInlinePathIcon() {
  return (tree: Root) => {
    visitHast(tree, (node) => {
      if (!isElement(node)) return

      // Skip block code and our own command pills.
      if (node.tagName === 'pre') return 'skip'
      if (hasClass(node, 'inline-shell-cmd')) return 'skip'

      // Shiki-wrapped inline code: decorate the inner <code>, don't recurse in.
      if (node.tagName === 'span' && hasClass(node, 'shiki')) {
        const codeChild = findElementChild(node, 'code')
        if (codeChild) {
          const kind = classify(getNodeText(codeChild))
          if (kind) {
            dimPlaceholders(codeChild)
            decorate(codeChild, kind)
          }
        }
        return 'skip'
      }

      // Plain inline <code>.
      if (node.tagName === 'code') {
        const kind = classify(getNodeText(node))
        if (kind) {
          dimPlaceholders(node)
          decorate(node, kind)
        }
        return 'skip'
      }
    })
  }
}

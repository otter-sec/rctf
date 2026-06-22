import { getCollection, type CollectionEntry } from 'astro:content'
import { plainInlineText } from './rich-text'

export type DocsEntry = CollectionEntry<'docs'>

export type DocsTreeNode =
  | { type: 'page'; href: string; label: string; order: number }
  | {
      type: 'group'
      href?: string
      label: string
      order: number
      children: DocsTreeNode[]
    }

type DocsGroup = Extract<DocsTreeNode, { type: 'group' }>

export const docsHref = (id: string) => (id === 'index' ? '/' : `/${id}`)

export const docsMdHref = (id: string) => `/${id}.md`

export async function getDocs(): Promise<DocsEntry[]> {
  return getCollection('docs', ({ data }) => !data.draft)
}

const humanize = (segment: string) => {
  const words = segment.replaceAll('-', ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const byOrder = (a: DocsTreeNode, b: DocsTreeNode) =>
  a.order - b.order || plainInlineText(a.label).localeCompare(plainInlineText(b.label))

export function buildDocsTree(entries: DocsEntry[]): DocsTreeNode[] {
  const root: DocsTreeNode[] = []
  const groups = new Map<string, DocsGroup>()

  const ensureGroup = (path: string): DocsGroup => {
    const existing = groups.get(path)
    if (existing) return existing
    const segments = path.split('/')
    const group: DocsGroup = {
      type: 'group',
      label: humanize(segments[segments.length - 1]),
      order: Infinity,
      children: [],
    }
    groups.set(path, group)
    const parent = segments.length > 1 ? ensureGroup(segments.slice(0, -1).join('/')) : null
    ;(parent ? parent.children : root).push(group)
    return group
  }

  for (const entry of entries) {
    if (entry.id === 'index') continue
    const isGroupIndex = entries.some(other => other.id.startsWith(`${entry.id}/`))
    if (isGroupIndex) {
      const group = ensureGroup(entry.id)
      group.label = entry.data.title
      group.href = docsHref(entry.id)
      group.order = entry.data.order ?? Infinity
    } else {
      const segments = entry.id.split('/')
      const parent = segments.length > 1 ? ensureGroup(segments.slice(0, -1).join('/')) : null
      ;(parent ? parent.children : root).push({
        type: 'page',
        href: docsHref(entry.id),
        label: entry.data.title,
        order: entry.data.order ?? Infinity,
      })
    }
  }

  const sortTree = (nodes: DocsTreeNode[]) => {
    nodes.sort(byOrder)
    for (const node of nodes) {
      if (node.type === 'group') sortTree(node.children)
    }
  }
  sortTree(root)
  return root
}

const byEntryOrder = (a: DocsEntry, b: DocsEntry) =>
  (a.data.order ?? Infinity) - (b.data.order ?? Infinity) ||
  plainInlineText(a.data.title).localeCompare(plainInlineText(b.data.title))

export function getScrollChain(entries: DocsEntry[], entry: DocsEntry): DocsEntry[] | null {
  let index: DocsEntry | undefined
  if (entry.data.scroll) {
    index = entry
  } else {
    const segments = entry.id.split('/')
    if (segments.length > 1) {
      const dir = segments.slice(0, -1).join('/')
      index = entries.find(other => other.id === dir && other.data.scroll)
    }
  }
  if (!index) return null

  const prefix = `${index.id}/`
  const children = entries
    .filter(other => other.id.startsWith(prefix) && !other.id.slice(prefix.length).includes('/'))
    .sort(byEntryOrder)
  return children.length > 0 ? [index, ...children] : null
}

export type FlatDoc = { href: string; title: string }

export function flattenDocsTree(entries: DocsEntry[], tree: DocsTreeNode[]): FlatDoc[] {
  const flat: FlatDoc[] = []
  const index = entries.find(entry => entry.id === 'index')
  if (index) flat.push({ href: '/', title: index.data.title })

  const walk = (nodes: DocsTreeNode[]) => {
    for (const node of nodes) {
      if (node.type === 'page') {
        flat.push({ href: node.href, title: node.label })
      } else {
        if (node.href) flat.push({ href: node.href, title: node.label })
        walk(node.children)
      }
    }
  }
  walk(tree)
  return flat
}

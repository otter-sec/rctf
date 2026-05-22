import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseCodeAnnotations, stripCodeAnnotationTags } from '@/lib/code-annotations'
import { docSlugFromId, getAllDocs, type Doc } from '@/lib/docs'
import { lightTheme } from '@/lib/shiki-themes'
import type { MetaFile } from '@/types'
import { ImageResponse } from '@vercel/og'
import type { ElementContent } from 'hast'
import { createElement as h, type CSSProperties, type ReactElement, type ReactNode } from 'react'
import { codeToTokens, type BundledLanguage } from 'shiki'

const THEME = {
  background: '#ffffff',
  foreground: '#171717',
  muted: '#737373',
  subtle: '#737373',
  codeForeground: '#171717',
  codeBackground: '#f0f0f0',
}

const TONE_HEX: Record<string, string> = {
  red: '#be2f2c',
  green: '#566d35',
  orange: '#a64930',
  yellow: '#806000',
  blue: '#4c6690',
  magenta: '#9039c9',
  cyan: '#256f74',
}

const ASSETS = resolve(process.cwd(), 'src/assets')
const outfitRegular = readFile(`${ASSETS}/fonts/Outfit-Regular.ttf`)
const outfitMedium = readFile(`${ASSETS}/fonts/Outfit-Medium.ttf`)
const cascadiaCode = readFile(`${ASSETS}/fonts/CascadiaCode-Regular.ttf`)
const wordmark = readFile(`${ASSETS}/wordmark-light.svg`, 'utf8').then(
  svg => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
)

const metaModules = {
  ...(import.meta.glob('/src/content/docs/_meta.ts', { eager: true }) as Record<
    string,
    { default: MetaFile }
  >),
  ...(import.meta.glob('/src/content/docs/**/_meta.ts', { eager: true }) as Record<
    string,
    { default: MetaFile }
  >),
}

const CODE_PILL: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  background: THEME.codeBackground,
  color: THEME.codeForeground,
  borderRadius: 5,
  padding: '0.03em 0.22em',
  fontFamily: 'Cascadia Code',
  fontSize: '0.88em',
  letterSpacing: '-0.025em',
  whiteSpace: 'pre',
}

interface InlineRender {
  plain: string
  nodes: ReactNode[]
}

export async function getStaticPaths() {
  const docs = await getAllDocs()
  return docs.map(doc => ({
    params: { slug: docSlugFromId(doc.id) ?? 'index' },
    props: { doc },
  }))
}

export async function GET({ props }: { props: { doc: Doc } }) {
  const { doc } = props
  const [title, description, wordmarkSrc, outfitR, outfitM, cascadia] = await Promise.all([
    renderInlineText(doc.data.title),
    doc.data.description ? renderInlineText(doc.data.description) : null,
    wordmark,
    outfitRegular,
    outfitMedium,
    cascadiaCode,
  ])

  return new ImageResponse(layout(doc.id, title, description, wordmarkSrc), {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Outfit', data: outfitR, weight: 400, style: 'normal' },
      { name: 'Outfit', data: outfitM, weight: 500, style: 'normal' },
      { name: 'Cascadia Code', data: cascadia, weight: 400, style: 'normal' },
    ],
  })
}

function layout(
  id: string,
  title: InlineRender,
  description: InlineRender | null,
  wordmarkSrc: string
): ReactElement {
  return h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 64,
        background: THEME.background,
        color: THEME.foreground,
        fontFamily: 'Outfit',
        letterSpacing: '-0.025em',
      },
    },
    h('img', { src: wordmarkSrc, alt: 'rCTF', style: { width: 220, height: 66 } }),
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', maxWidth: 980 } },
      breadcrumbRow(id),
      titleRow(title),
      description?.plain ? descriptionRow(description) : null
    )
  )
}

function breadcrumbRow(id: string): ReactNode {
  const parts = breadcrumbParts(id)
  return h(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        color: THEME.subtle,
        fontSize: 21,
        fontWeight: 500,
        lineHeight: 1,
        letterSpacing: '-0.025em',
        marginBottom: 20,
      },
    },
    ...parts.flatMap((part, i) => {
      const label = h('span', { key: `b-${i}`, style: { letterSpacing: '-0.025em' } }, part)
      if (i === 0) return [label]
      const sep = h(
        'span',
        {
          key: `c-${i}`,
          style: {
            color: THEME.subtle,
            letterSpacing: '-0.025em',
            marginLeft: 11,
            marginRight: 11,
          },
        },
        '›'
      )
      return [sep, label]
    })
  )
}

function titleRow({ plain, nodes }: InlineRender): ReactNode {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        fontSize: titleSize(plain),
        fontWeight: 500,
        lineHeight: 1.02,
        letterSpacing: '-0.025em',
      },
    },
    ...nodes
  )
}

function descriptionRow({ nodes }: InlineRender): ReactNode {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        color: THEME.muted,
        fontSize: 28,
        lineHeight: 1.23,
        letterSpacing: '-0.025em',
        marginTop: 18,
        maxWidth: 940,
      },
    },
    ...nodes
  )
}

async function renderInlineText(text: string): Promise<InlineRender> {
  const plain = stripCodeAnnotationTags(
    text.replace(/`([^`]+?)(?:\{:([a-z0-9]+)\})?`/g, (_, code) => code)
  )
  const nodes: ReactNode[] = []
  let cursor = 0
  let key = 0

  for (const match of text.matchAll(/`([^`]+?)(?:\{:([a-z0-9]+)\})?`/g)) {
    const [full, code, lang] = match
    const start = match.index ?? 0
    if (start > cursor) pushAnnotated(nodes, text.slice(cursor, start), key++)
    const trailingSpace = /\s/.test(text[start + full.length] ?? '')
    nodes.push(await renderInlineCode(code, lang, key++, trailingSpace))
    cursor = start + full.length
  }
  if (cursor < text.length) pushAnnotated(nodes, text.slice(cursor), key++)

  return { plain, nodes }
}

function pushAnnotated(out: ReactNode[], text: string, baseKey: number): void {
  const annotated = parseCodeAnnotations(text)
  if (annotated) pushHastNodes(out, annotated, `ann-${baseKey}`, true)
  else pushWords(out, text, baseKey)
}

function pushHastNodes(
  out: ReactNode[],
  hastNodes: ElementContent[],
  keyPrefix: string,
  topLevel: boolean
): void {
  hastNodes.forEach((node, i) => {
    const key = `${keyPrefix}-${i}`
    if (node.type === 'text') {
      if (topLevel) pushWords(out, node.value, key)
      else out.push(node.value)
      return
    }
    if (node.type !== 'element') return

    const classes = Array.isArray(node.properties?.className)
      ? (node.properties.className as string[])
      : []
    const tones = classes.filter(c => c.startsWith('is-')).map(c => c.slice(3))
    const children: ReactNode[] = []
    pushHastNodes(children, node.children as ElementContent[], key, false)
    out.push(h('span', { key, style: spanStyle(tones, classes) }, ...children))
  })
}

function spanStyle(tones: string[], classes: string[]): CSSProperties {
  const style: CSSProperties = { letterSpacing: '-0.025em' }

  const colorTone = tones.find(t => TONE_HEX[t])
  if (colorTone) style.color = TONE_HEX[colorTone]
  else if (tones.includes('black')) style.color = THEME.muted
  else if (tones.includes('white')) style.color = THEME.foreground

  if (tones.includes('dim') || tones.includes('dimmed')) style.opacity = 0.5

  if (classes.includes('code-route') || classes.includes('code-response')) {
    return { ...CODE_PILL, ...style, color: style.color ?? THEME.codeForeground }
  }
  return style
}

function pushWords(out: ReactNode[], text: string, baseKey: number | string): void {
  const parts = text.match(/\s*\S+\s*/g) ?? []
  parts.forEach((part, i) => {
    const word = part.trim()
    if (!word) return
    out.push(
      h(
        'span',
        {
          key: `w-${baseKey}-${i}`,
          style: {
            letterSpacing: '-0.025em',
            marginLeft: /^\s/.test(part) ? '0.25em' : 0,
            marginRight: /\s$/.test(part) ? '0.25em' : 0,
          },
        },
        word
      )
    )
  })
}

async function renderInlineCode(
  code: string,
  lang: string | undefined,
  index: number,
  trailingSpace: boolean
): Promise<ReactNode> {
  const key = `code-${index}`
  const style: CSSProperties = { ...CODE_PILL, marginRight: trailingSpace ? '0.25em' : 0 }

  if (!lang) return h('span', { key, style }, code)

  const highlighted = await codeToTokens(code, { lang: lang as BundledLanguage, theme: lightTheme })

  return h(
    'span',
    { key, style },
    ...highlighted.tokens.flat().map((token, i) =>
      h(
        'span',
        {
          key: `t-${i}`,
          style: {
            color: token.color ?? THEME.codeForeground,
            letterSpacing: '-0.025em',
            whiteSpace: 'pre',
          },
        },
        token.content
      )
    )
  )
}

function titleSize(title: string): number {
  if (title.length > 70) return 50
  if (title.length > 52) return 56
  if (title.length > 34) return 62
  return 70
}

function breadcrumbParts(id: string): string[] {
  if (id === 'index') return ['Docs']
  const parts = id
    .replace(/\/index$/, '')
    .split('/')
    .filter(Boolean)
  if (parts.length === 0) return ['Docs']
  return parts.slice(0, 2).map((_, i) => breadcrumbLabel(parts, i))
}

function breadcrumbLabel(parts: string[], index: number): string {
  const part = parts[index]
  if (part === 'v1' || part === 'v2') return part
  const parentPath = parts.slice(0, index).join('/')
  const currentPath = parts.slice(0, index + 1).join('/')
  return (
    metaFor(parentPath).items?.[part]?.label ?? metaFor(currentPath).label ?? sentenceCase(part)
  )
}

function metaFor(dirPath: string): MetaFile {
  const key = dirPath ? `/src/content/docs/${dirPath}/_meta.ts` : '/src/content/docs/_meta.ts'
  return metaModules[key]?.default ?? {}
}

function sentenceCase(input: string): string {
  const text = input.split('-').filter(Boolean).join(' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

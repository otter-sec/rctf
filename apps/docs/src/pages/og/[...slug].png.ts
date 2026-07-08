import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseCodeAnnotations, stripCodeAnnotationTags } from '@/lib/code-annotations'
import { getDocs, type DocsEntry } from '@/lib/docs'
import { plainInline } from '@/lib/inline-markdown'
import type { ElementContent } from 'hast'
import satori from 'satori'
import sharp from 'sharp'

type CSSProperties = Record<string, string | number | undefined>

type VNode = VElement | string | null

interface VElement {
  type: string
  props: Record<string, unknown>
}

function h(
  type: string,
  props: (Record<string, unknown> & { style?: CSSProperties }) | null,
  ...children: VNode[]
): VElement {
  const kids = children.filter((child): child is VElement | string => child != null)
  return {
    type,
    props: { ...props, children: kids.length === 1 ? kids[0] : kids },
  }
}

const THEME = {
  background: '#fafafa',
  foreground: '#0a0a0a',
  muted: '#737373',
  codeBackground: '#f0f0f0',
}

const TONE_HEX: Record<string, string> = {
  red: '#ce2c31',
  orange: '#cc4e00',
  yellow: '#9e6c00',
  green: '#218358',
  cyan: '#107d98',
  blue: '#0d74ce',
  magenta: '#953ea3',
  black: THEME.muted,
  white: THEME.foreground,
}

const INLINE_CODE_RE = /`([^`]+?)(?:\{:[A-Za-z0-9_.-]+\})?`/g

const CHIP_SURFACE: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  flexWrap: 'wrap',
  fontFamily: 'IBM Plex Mono',
  fontSize: '0.9em',
  padding: '0.1em 0.3em',
  borderRadius: 6,
  background: THEME.codeBackground,
}

const CODE_CHIP: CSSProperties = CHIP_SURFACE

const ASSETS = resolve(process.cwd(), 'src/assets')
const wordmark = readFile(`${ASSETS}/wordmark-light.svg`)
  .then(svg => sharp(svg).resize({ width: 390 }).png().toBuffer())
  .then(png => `data:image/png;base64,${png.toString('base64')}`)
const sansRegular = readFile(`${ASSETS}/fonts/IBMPlexSans-Regular.ttf`)
const sansMedium = readFile(`${ASSETS}/fonts/IBMPlexSans-Medium.ttf`)
const monoRegular = readFile(`${ASSETS}/fonts/IBMPlexMono-Regular.ttf`)
const monoMedium = readFile(`${ASSETS}/fonts/IBMPlexMono-Medium.ttf`)

export async function getStaticPaths() {
  const docs = await getDocs()
  return docs.map(entry => ({
    params: { slug: entry.id },
    props: { entry },
  }))
}

export async function GET({ props }: { props: { entry: DocsEntry } }) {
  const { entry } = props
  const docs = await getDocs()
  const [wordmarkSrc, regular, medium, mono, monoMed] = await Promise.all([
    wordmark,
    sansRegular,
    sansMedium,
    monoRegular,
    monoMedium,
  ])
  const title = entry.data.title
  const description = entry.data.description ?? null

  const tree = layout(
    breadcrumb(entry.id, docs),
    title,
    description,
    wordmarkSrc
  ) as unknown as Parameters<typeof satori>[0]
  const svg = await satori(tree, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'IBM Plex Sans', data: regular, weight: 400, style: 'normal' },
      { name: 'IBM Plex Sans', data: medium, weight: 500, style: 'normal' },
      { name: 'IBM Plex Mono', data: mono, weight: 400, style: 'normal' },
      { name: 'IBM Plex Mono', data: monoMed, weight: 500, style: 'normal' },
    ],
  })
  const png = await sharp(Buffer.from(svg)).png().toBuffer()
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

function layout(
  crumbs: string[],
  title: string,
  description: string | null,
  wordmarkSrc: string
): VElement {
  return h(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: THEME.background,
        color: THEME.foreground,
        fontFamily: 'IBM Plex Sans',
        letterSpacing: '-0.02em',
      },
    },
    h('img', { src: wordmarkSrc, width: 195, height: 59 }),
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', maxWidth: 1000 } },
      crumbs.length > 0 ? breadcrumbRow(crumbs) : null,
      titleRow(title),
      description ? descriptionRow(description) : null
    )
  )
}

function breadcrumbRow(crumbs: string[]): VNode {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: 20,
        color: THEME.muted,
        fontSize: 24,
        fontWeight: 500,
      },
    },
    ...crumbs.flatMap((label, i) => {
      const item = h('span', { key: `c${i}` }, label)
      if (i === 0) return [item]
      const sep = h('span', { key: `s${i}`, style: { margin: '0 12px' } }, '›')
      return [sep, item]
    })
  )
}

function titleRow(title: string): VNode {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        fontSize: titleSize(plainInline(title)),
        fontWeight: 500,
        lineHeight: 1.05,
      },
    },
    ...richNodes(title, 't')
  )
}

function descriptionRow(description: string): VNode {
  return h(
    'div',
    {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        marginTop: 20,
        color: THEME.muted,
        fontSize: 30,
        lineHeight: 1.3,
      },
    },
    ...richNodes(description, 'd')
  )
}

function richNodes(value: string, keyPrefix: string): VNode[] {
  const out: VNode[] = []
  let last = 0
  let i = 0

  for (const match of value.matchAll(INLINE_CODE_RE)) {
    const index = match.index ?? 0
    if (index > last) {
      out.push(...annotatedNodes(value.slice(last, index), `${keyPrefix}-x${i}`))
    }
    out.push(codeChip(match[1] ?? '', `${keyPrefix}-c${i}`))
    last = index + match[0].length
    i++
  }
  if (last < value.length) {
    out.push(...annotatedNodes(value.slice(last), `${keyPrefix}-x${i}`))
  }
  return out
}

function annotatedNodes(text: string, keyPrefix: string): VNode[] {
  const tree = parseCodeAnnotations(text)
  return tree ? hastToNodes(tree, keyPrefix) : [textSpan(text, keyPrefix)]
}

function textSpan(value: string, key: string): VNode {
  return h('span', { key, style: { whiteSpace: 'pre-wrap' } }, value)
}

function hastToNodes(nodes: ElementContent[], keyPrefix: string): VNode[] {
  return nodes.flatMap((node, i): VNode[] => {
    const key = `${keyPrefix}-${i}`
    if (node.type === 'text') return [textSpan(node.value, key)]
    if (node.type !== 'element') return []

    const classes = Array.isArray(node.properties?.className)
      ? (node.properties.className as string[])
      : []
    const children = hastToNodes(node.children, key)
    const style: CSSProperties = {}

    const color = toneColor(classes)
    if (color) style.color = color
    if (classes.includes('is-dim') || classes.includes('is-dimmed')) {
      style.opacity = 0.5
    }
    const isChip = classes.includes('code-route') || classes.includes('code-response')
    if (isChip) Object.assign(style, CHIP_SURFACE)
    if (isChip || children.length > 1) {
      style.display = 'flex'
      style.alignItems = 'baseline'
      style.flexWrap = 'wrap'
    }
    return [h('span', { key, style }, ...children)]
  })
}

function toneColor(classes: string[]): string | undefined {
  for (const cls of classes) {
    if (cls.startsWith('is-')) {
      const tone = cls.slice(3)
      if (tone in TONE_HEX) return TONE_HEX[tone]
    }
  }
  return undefined
}

function codeChip(value: string, key: string): VNode {
  const code = stripCodeAnnotationTags(value).replace(/^\$ /, '')
  return h('span', { key, style: CODE_CHIP }, code)
}

function titleSize(title: string): number {
  if (title.length > 70) return 52
  if (title.length > 52) return 58
  if (title.length > 34) return 66
  return 74
}

const humanize = (segment: string) => {
  const words = segment.replaceAll('-', ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function breadcrumb(id: string, docs: DocsEntry[]): string[] {
  if (id === 'index') return ['Docs']
  const segments = id.split('/')
  const ancestors = segments.slice(0, -1)
  if (ancestors.length === 0) return ['Docs']
  const titleById = new Map(docs.map(entry => [entry.id, plainInline(entry.data.title)]))
  const labels = ancestors.map((segment, i) => {
    const prefix = segments.slice(0, i + 1).join('/')
    return titleById.get(prefix) ?? humanize(segment)
  })
  return labels.slice(-2)
}

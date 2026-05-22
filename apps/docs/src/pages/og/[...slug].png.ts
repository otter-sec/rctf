import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseCodeAnnotations, stripCodeAnnotationTags } from '@/lib/code-annotations'
import { docSlugFromId, getAllDocs, type Doc } from '@/lib/docs'
import { lightTheme } from '@/lib/shiki-themes'
import type { MetaFile } from '@/types'
import { ImageResponse } from '@vercel/og'
import type { ElementContent } from 'hast'
import React from 'react'
import { codeToTokens } from 'shiki'
import type { BundledLanguage } from 'shiki'

const size = {
  width: 1200,
  height: 630,
}

const outfitRegular = readFile(resolve(process.cwd(), 'src/assets/fonts/Outfit-Regular.ttf'))
const outfitMedium = readFile(resolve(process.cwd(), 'src/assets/fonts/Outfit-Medium.ttf'))
const cascadiaCodeRegular = readFile(
  resolve(process.cwd(), 'src/assets/fonts/CascadiaCode-Regular.ttf')
)
const wordmarkLight = readFile(resolve(process.cwd(), 'src/assets/wordmark-light.svg'), 'utf8')
const INLINE_CODE_PATTERN = /`([^`]+?)(?:\{:([a-z0-9]+)\})?`/g
const TRACKING_TIGHT = '-0.025em'

// Mirrors --inline-tone-* in apps/docs/src/styles/global.css (light theme).
const TONE_HEX: Record<string, string> = {
  red: '#be2f2c',
  green: '#566d35',
  orange: '#a64930',
  yellow: '#806000',
  blue: '#4c6690',
  magenta: '#9039c9',
  cyan: '#256f74',
}

const metaModules = {
  ...(import.meta.glob('/src/content/docs/_meta.ts', {
    eager: true,
  }) as Record<string, { default: MetaFile }>),
  ...(import.meta.glob('/src/content/docs/**/_meta.ts', {
    eager: true,
  }) as Record<string, { default: MetaFile }>),
}

export async function getStaticPaths() {
  const docs = await getAllDocs()

  return docs.map(doc => ({
    params: { slug: docSlugFromId(doc.id) ?? 'index' },
    props: { doc },
  }))
}

interface Props {
  doc: Doc
}

export async function GET({ props }: { props: Props }) {
  const { doc } = props
  const theme = resolveTheme()
  const [title, description, wordmark, outfitRegularData, outfitMediumData, cascadiaCodeData] =
    await Promise.all([
      renderInlineText(doc.data.title, theme),
      doc.data.description ? renderInlineText(doc.data.description, theme) : null,
      svgDataUrl(wordmarkLight),
      outfitRegular,
      outfitMedium,
      cascadiaCodeRegular,
    ])
  const breadcrumb = breadcrumbParts(doc.id)

  return new ImageResponse(
    React.createElement(
      'div',
      {
        style: {
          position: 'relative',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: theme.background,
          color: theme.foreground,
          fontFamily: 'Outfit',
          letterSpacing: TRACKING_TIGHT,
        },
      },
      React.createElement(
        'div',
        {
          style: {
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: 64,
          },
        },
        React.createElement('img', {
          src: wordmark,
          alt: 'rCTF',
          style: {
            // SVG viewBox is 1020x308; preserve aspect ratio so the logo
            // hugs the top-left padding instead of being centered in a wider box.
            width: 220,
            height: 66,
          },
        }),
        React.createElement(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              maxWidth: 980,
            },
          },
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                color: theme.subtle,
                fontSize: 21,
                fontWeight: 500,
                lineHeight: 1,
                letterSpacing: TRACKING_TIGHT,
                marginBottom: 20,
              },
            },
            breadcrumb.flatMap((part, index) => [
              index > 0
                ? React.createElement(
                    'span',
                    {
                      key: `chevron-${index}`,
                      style: {
                        color: theme.subtle,
                        letterSpacing: TRACKING_TIGHT,
                        marginLeft: 11,
                        marginRight: 11,
                      },
                    },
                    '›'
                  )
                : null,
              React.createElement(
                'span',
                { key: `part-${index}`, style: { letterSpacing: TRACKING_TIGHT } },
                part
              ),
            ])
          ),
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                flexWrap: 'wrap',
                fontSize: titleSize(title.plain),
                fontWeight: 500,
                lineHeight: 1.02,
                letterSpacing: TRACKING_TIGHT,
              },
            },
            title.nodes
          ),
          description?.plain
            ? React.createElement(
                'div',
                {
                  style: {
                    display: 'flex',
                    flexWrap: 'wrap',
                    color: theme.muted,
                    fontSize: 28,
                    lineHeight: 1.23,
                    letterSpacing: TRACKING_TIGHT,
                    marginTop: 18,
                    maxWidth: 940,
                  },
                },
                description.nodes
              )
            : null
        )
      )
    ),
    {
      ...size,
      fonts: [
        { name: 'Outfit', data: outfitRegularData, weight: 400, style: 'normal' },
        { name: 'Outfit', data: outfitMediumData, weight: 500, style: 'normal' },
        { name: 'Cascadia Code', data: cascadiaCodeData, weight: 400, style: 'normal' },
      ],
    }
  )
}

async function svgDataUrl(svg: Promise<string>): Promise<string> {
  const data = await svg
  return `data:image/svg+xml;base64,${Buffer.from(data).toString('base64')}`
}

type OgTheme = ReturnType<typeof resolveTheme>

async function renderInlineText(
  text: string,
  theme: OgTheme
): Promise<{ plain: string; nodes: React.ReactNode[] }> {
  const nodes: React.ReactNode[] = []
  const plain = stripCodeAnnotationTags(text.replace(INLINE_CODE_PATTERN, (_, code) => code))
  const re = new RegExp(INLINE_CODE_PATTERN.source, 'g')
  let lastIndex = 0
  let index = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(text)) !== null) {
    const [full, code, lang] = match
    if (match.index > lastIndex) {
      pushAnnotatedTextNodes(nodes, text.slice(lastIndex, match.index), index++, theme)
    }

    nodes.push(
      await renderInlineCode(
        code,
        lang,
        theme,
        index++,
        /\s/.test(text[match.index + full.length] ?? '')
      )
    )
    lastIndex = match.index + full.length
  }

  if (lastIndex < text.length) {
    pushAnnotatedTextNodes(nodes, text.slice(lastIndex), index++, theme)
  }

  return { plain, nodes }
}

function pushAnnotatedTextNodes(
  nodes: React.ReactNode[],
  text: string,
  baseIndex: number,
  theme: OgTheme
): void {
  const annotated = parseCodeAnnotations(text)
  if (!annotated) {
    pushTextNodes(nodes, text, baseIndex)
    return
  }
  pushHastNodes(nodes, annotated, theme, `ann-${baseIndex}`, true)
}

function pushHastNodes(
  out: React.ReactNode[],
  hastNodes: ElementContent[],
  theme: OgTheme,
  keyPrefix: string,
  topLevel: boolean
): void {
  hastNodes.forEach((node, i) => {
    const key = `${keyPrefix}-${i}`
    if (node.type === 'text') {
      // Top-level text is laid out as a flex item next to pills; satori
      // collapses its leading whitespace, so route through pushTextNodes
      // which encodes whitespace as margins. Inside a pill (whiteSpace:
      // pre) the raw string preserves spaces.
      if (topLevel) pushTextNodes(out, node.value, key)
      else out.push(node.value)
      return
    }
    if (node.type !== 'element') return

    const classes = Array.isArray(node.properties?.className)
      ? (node.properties.className as string[])
      : []
    const tones = classes.filter(c => c.startsWith('is-')).map(c => c.slice(3))

    const style: React.CSSProperties = { letterSpacing: TRACKING_TIGHT }

    const colorTone = tones.find(t => TONE_HEX[t])
    if (colorTone) style.color = TONE_HEX[colorTone]
    else if (tones.includes('black')) style.color = theme.muted
    else if (tones.includes('white')) style.color = theme.foreground

    if (tones.includes('dim') || tones.includes('dimmed')) style.opacity = 0.5

    if (classes.includes('code-route') || classes.includes('code-response')) {
      Object.assign(style, {
        display: 'flex',
        alignItems: 'baseline',
        background: theme.codeBackground,
        color: style.color ?? theme.codeForeground,
        borderRadius: 5,
        padding: '0.03em 0.22em',
        fontFamily: 'Cascadia Code',
        fontSize: '0.88em',
        whiteSpace: 'pre',
      })
    }

    const children: React.ReactNode[] = []
    pushHastNodes(children, node.children as ElementContent[], theme, key, false)

    out.push(React.createElement('span', { key, style }, ...children))
  })
}

function pushTextNodes(nodes: React.ReactNode[], text: string, baseIndex: number | string): void {
  const parts = text.match(/\s*\S+\s*/g) ?? []
  parts.forEach((part, index) => {
    const word = part.trim()
    if (!word) return
    const leading = /^\s/.test(part)
    const trailing = /\s$/.test(part)

    nodes.push(
      React.createElement(
        'span',
        {
          key: `text-${baseIndex}-${index}`,
          style: {
            letterSpacing: TRACKING_TIGHT,
            marginLeft: leading ? '0.25em' : 0,
            marginRight: trailing ? '0.25em' : 0,
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
  theme: OgTheme,
  index: number,
  trailingSpace = false
): Promise<React.ReactNode> {
  const codeStyle = {
    display: 'flex',
    alignItems: 'baseline',
    color: theme.codeForeground,
    background: theme.codeBackground,
    borderRadius: 5,
    padding: '0.03em 0.22em',
    fontFamily: 'Cascadia Code',
    fontSize: '0.88em',
    letterSpacing: TRACKING_TIGHT,
    marginRight: trailingSpace ? '0.25em' : 0,
    whiteSpace: 'pre',
  }

  if (!lang) {
    return React.createElement('span', { key: `code-${index}`, style: codeStyle }, code)
  }

  const highlighted = await codeToTokens(code, {
    lang: lang as BundledLanguage,
    theme: lightTheme,
  })

  return React.createElement(
    'span',
    { key: `code-${index}`, style: codeStyle },
    highlighted.tokens.flat().map((token, tokenIndex) =>
      React.createElement(
        'span',
        {
          key: `token-${tokenIndex}`,
          style: {
            color: token.color ?? theme.codeForeground,
            letterSpacing: TRACKING_TIGHT,
            whiteSpace: 'pre',
          },
        },
        token.content
      )
    )
  )
}

function resolveTheme() {
  return {
    background: '#ffffff',
    foreground: '#171717',
    muted: '#737373',
    subtle: '#737373',
    border: '#ececec',
    codeForeground: '#171717',
    codeBackground: '#f0f0f0',
  }
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

  return parts.slice(0, 2).map((_, index) => breadcrumbLabel(parts, index))
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

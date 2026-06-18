import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { getDocs, type DocsEntry } from "@/lib/docs"
import { plainInlineText } from "@/lib/rich-text"
import { ImageResponse } from "@vercel/og"
import { createElement as h, type ReactElement, type ReactNode } from "react"

const THEME = {
  background: "#fafafa",
  foreground: "#0a0a0a",
  muted: "#737373",
}

const ASSETS = resolve(process.cwd(), "src/assets")
const wordmark = readFile(`${ASSETS}/wordmark-light.svg`, "utf8").then(
  (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
)
const sansRegular = readFile(`${ASSETS}/fonts/IBMPlexSans-Regular.ttf`)
const sansMedium = readFile(`${ASSETS}/fonts/IBMPlexSans-Medium.ttf`)

export async function getStaticPaths() {
  const docs = await getDocs()
  return docs.map((entry) => ({
    params: { slug: entry.id },
    props: { entry },
  }))
}

export async function GET({ props }: { props: { entry: DocsEntry } }) {
  const { entry } = props
  const docs = await getDocs()
  const [wordmarkSrc, regular, medium] = await Promise.all([
    wordmark,
    sansRegular,
    sansMedium,
  ])
  const title = plainInlineText(entry.data.title)
  const description = entry.data.description
    ? plainInlineText(entry.data.description)
    : null

  return new ImageResponse(
    layout(breadcrumb(entry.id, docs), title, description, wordmarkSrc),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "IBM Plex Sans", data: regular, weight: 400, style: "normal" },
        { name: "IBM Plex Sans", data: medium, weight: 500, style: "normal" },
      ],
    },
  )
}

function layout(
  crumbs: string[],
  title: string,
  description: string | null,
  wordmarkSrc: string,
): ReactElement {
  return h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: THEME.background,
        color: THEME.foreground,
        fontFamily: "IBM Plex Sans",
        letterSpacing: "-0.02em",
      },
    },
    h("img", { src: wordmarkSrc, width: 195, height: 59 }),
    h(
      "div",
      { style: { display: "flex", flexDirection: "column", maxWidth: 1000 } },
      crumbs.length > 0 ? breadcrumbRow(crumbs) : null,
      titleRow(title),
      description ? descriptionRow(description) : null,
    ),
  )
}

function breadcrumbRow(crumbs: string[]): ReactNode {
  return h(
    "div",
    {
      style: {
        display: "flex",
        alignItems: "center",
        marginBottom: 20,
        color: THEME.muted,
        fontSize: 24,
        fontWeight: 500,
      },
    },
    ...crumbs.flatMap((label, i) => {
      const item = h("span", { key: `c${i}` }, label)
      if (i === 0) return [item]
      const sep = h("span", { key: `s${i}`, style: { margin: "0 12px" } }, "›")
      return [sep, item]
    }),
  )
}

function titleRow(title: string): ReactNode {
  return h(
    "div",
    {
      style: {
        display: "flex",
        fontSize: titleSize(title),
        fontWeight: 500,
        lineHeight: 1.05,
      },
    },
    title,
  )
}

function descriptionRow(description: string): ReactNode {
  return h(
    "div",
    {
      style: {
        display: "flex",
        marginTop: 20,
        color: THEME.muted,
        fontSize: 30,
        lineHeight: 1.3,
      },
    },
    description,
  )
}

function titleSize(title: string): number {
  if (title.length > 70) return 52
  if (title.length > 52) return 58
  if (title.length > 34) return 66
  return 74
}

const humanize = (segment: string) => {
  const words = segment.replaceAll("-", " ")
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function breadcrumb(id: string, docs: DocsEntry[]): string[] {
  if (id === "index") return ["Docs"]
  const segments = id.split("/")
  const ancestors = segments.slice(0, -1)
  if (ancestors.length === 0) return ["Docs"]
  const titleById = new Map(
    docs.map((entry) => [entry.id, plainInlineText(entry.data.title)]),
  )
  const labels = ancestors.map((segment, i) => {
    const prefix = segments.slice(0, i + 1).join("/")
    return titleById.get(prefix) ?? humanize(segment)
  })
  return labels.slice(-2)
}

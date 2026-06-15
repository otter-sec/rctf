import { SITE } from "@/consts"
import {
  buildDocsTree,
  docsHref,
  docsMdHref,
  flattenDocsTree,
  getDocs,
} from "@/lib/docs"
import type { APIRoute } from "astro"

export const GET: APIRoute = async ({ site }) => {
  const docs = await getDocs()
  const flat = flattenDocsTree(docs, buildDocsTree(docs))
  const base = site ?? new URL("http://localhost:4321")
  const byHref = new Map(docs.map((entry) => [docsHref(entry.id), entry]))

  const lines = flat.map((doc) => {
    const entry = byHref.get(doc.href)
    if (!entry) return `- [${doc.title}](${new URL(doc.href, base)})`
    const url = new URL(docsMdHref(entry.id), base)
    const description = entry.data.description
    return `- [${doc.title}](${url})${description ? `: ${description}` : ""}`
  })

  const text = [
    `# ${SITE.title}`,
    "",
    `> ${SITE.description}`,
    "",
    "## Docs",
    "",
    ...lines,
    "",
  ].join("\n")

  return new Response(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}

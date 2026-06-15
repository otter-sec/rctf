import { readFileSync } from "node:fs"
import { getDocs, type DocsEntry } from "@/lib/docs"
import type { APIRoute } from "astro"

export async function getStaticPaths() {
  const docs = await getDocs()
  return docs.map((entry) => ({
    params: { slug: entry.id },
    props: { entry },
  }))
}

export const GET: APIRoute<{ entry: DocsEntry }> = ({ props }) => {
  const source = props.entry.filePath
    ? readFileSync(props.entry.filePath, "utf8")
    : (props.entry.body ?? "")
  return new Response(source, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  })
}

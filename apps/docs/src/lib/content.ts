import { SITE } from "@/consts"
import type { MarkdownHeading } from "astro"
import { getCollection, type CollectionEntry } from "astro:content"
import { isSubpost } from "@/lib/utils"

export const pageTitle = (title: string) => `${title} | ${SITE.title}`

export type TocHeading = MarkdownHeading & { html?: string }

const HEADING_RE = /<h([2-6])[^>]*\bid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g
// Anchors are unwrapped rather than removed: the heading-anchor link is empty
// (so unwrapping deletes it), and a linked heading keeps its text without
// nesting an <a> inside the TOC's own link. copy-command is interactive
// (role, tabindex, a global click-to-copy handler), so it is unwrapped too,
// along with its decorative shell prompt.
const TOC_UNSUPPORTED_RE =
  /<\/?(?:a|copy-command)\b[^>]*>|<span class="shell-prompt"[^>]*><\/span>/g

/**
 * Pair Astro's plain-text headings with their rendered inner HTML so the TOC
 * can keep inline formatting (code, tones) that `MarkdownHeading.text`
 * flattens away.
 */
export function enrichHeadings(
  headings: MarkdownHeading[],
  html: string | undefined,
): TocHeading[] {
  if (!html) return headings
  const inner = new Map<string, string>()
  for (const [, , id, content] of html.matchAll(HEADING_RE)) {
    inner.set(id, content.replace(TOC_UNSUPPORTED_RE, "").trim())
  }
  return headings.map((heading) => {
    const html = inner.get(heading.slug)
    return html && html !== heading.text ? { ...heading, html } : heading
  })
}

export async function getPosts(): Promise<CollectionEntry<"blog">[]> {
  const posts = await getCollection("blog", ({ data }) => !data.draft)
  return posts
    .filter((post) => !isSubpost(post.id))
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
}

export async function getSubposts(): Promise<
  Map<string, CollectionEntry<"blog">[]>
> {
  const posts = await getCollection(
    "blog",
    ({ id, data }) => !data.draft && id.split("/").length === 2,
  )
  posts.sort(
    (a, b) =>
      (a.data.order ?? Infinity) - (b.data.order ?? Infinity) ||
      a.data.date.getTime() - b.data.date.getTime(),
  )
  return Map.groupBy(posts, (post) => post.id.split("/")[0])
}

export async function getTags(): Promise<
  Map<string, CollectionEntry<"blog">[]>
> {
  const posts = await getPosts()
  const series = await getSubposts()
  const tags = new Map<string, CollectionEntry<"blog">[]>()
  for (const post of posts) {
    const chain = [post, ...(series.get(post.id) ?? [])]
    for (const tag of new Set(
      chain.flatMap((entry) => entry.data.tags ?? []),
    )) {
      const tagged = tags.get(tag)
      if (tagged) tagged.push(post)
      else tags.set(tag, [post])
    }
  }
  return new Map(
    [...tags].sort(
      ([a, postsA], [b, postsB]) =>
        postsB.length - postsA.length || a.localeCompare(b),
    ),
  )
}

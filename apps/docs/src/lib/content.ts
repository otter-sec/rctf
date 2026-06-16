import { SITE } from "@/consts"
import type { MarkdownHeading } from "astro"
import { plainInlineText } from "./rich-text"

export const pageTitle = (title: string) =>
  `${plainInlineText(title)} | ${SITE.title}`

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

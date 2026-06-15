import { readFileSync } from "node:fs"
import GithubSlugger from "github-slugger"
import { defineHastPlugin } from "satteri"

const SUBPOST = /\/blog\/[^/]+\/(?!index\.md$)([^/]+)\.md$/
const DOCS_PAGE = /\/src\/content\/docs\/.+\/(?!index\.md$)([^/]+)\.md$/

// Whether a docs folder opted into the continuous reading chain via
// `scroll: true` on its index.md. Read from disk because the plugin only
// sees one file at a time; cached for the process (restart dev after
// toggling the flag).
const scrollDirs = new Map<string, boolean>()

function isScrollDir(indexPath: string): boolean {
  const cached = scrollDirs.get(indexPath)
  if (cached !== undefined) return cached

  let scroll = false
  try {
    const frontmatter = /^---\n([\s\S]*?)\n---/.exec(
      readFileSync(indexPath, "utf8"),
    )?.[1]
    scroll = !!frontmatter && /^scroll:\s*true\s*$/m.test(frontmatter)
  } catch {}

  scrollDirs.set(indexPath, scroll)
  return scroll
}

function namespace(path: string): string | null {
  const subpost = SUBPOST.exec(path)
  if (subpost) return subpost[1]

  const docs = DOCS_PAGE.exec(path)
  if (!docs) return null
  const indexPath = `${path.slice(0, path.lastIndexOf("/") + 1)}index.md`
  return isScrollDir(indexPath) ? docs[1] : null
}

export function headingNamespace() {
  const slugger = new GithubSlugger()
  return defineHastPlugin({
    name: "heading-namespace",
    element: {
      filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
      visit(node, ctx) {
        const prefix = ctx.fileURL && namespace(ctx.fileURL.pathname)
        if (!prefix) return
        ctx.setProperty(
          node,
          "id",
          `${prefix}-${slugger.slug(ctx.textContent(node))}`,
        )
      },
    },
  })
}

import { readFile, writeFile, readdir } from 'node:fs/promises'
import { join, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONTENT_DIR = resolve(__dirname, '..', 'src', 'content', 'docs')

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(full)))
    else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx'))
      files.push(full)
  }
  return files
}

const COMPONENT_IMPORTS = {
  Callout: "import Callout from '@/components/callout.astro'",
  Steps: "import Steps from '@/components/mdx/steps.astro'",
  Tabs: "import Tabs from '@/components/mdx/tabs.astro'",
  Tab: "import Tab from '@/components/mdx/tab.astro'",
  Card: "import Card from '@/components/mdx/card.astro'",
  CardGrid: "import CardGrid from '@/components/mdx/card-grid.astro'",
  Accordion: "import Accordion from '@/components/mdx/accordion.astro'",
  AccordionItem:
    "import AccordionItem from '@/components/mdx/accordion-item.astro'",
  FileTree: "import FileTree from '@/components/mdx/file-tree.astro'",
  Badge: "import Badge from '@/components/mdx/badge.astro'",
  Swatch: "import Swatch from '@/components/mdx/swatch'",
}

function transform(source) {
  let out = source

  // 1. Drop Starlight component imports (we'll add erudocs imports below).
  out = out.replace(
    /^import \{[^}]+\} from ['"]@astrojs\/starlight\/components['"]\r?\n/gm,
    '',
  )

  // 2. Drop any existing Swatch import so we can re-add the canonical one.
  out = out.replace(
    /^import Swatch from ['"][^'"]+\/Swatch['"]\r?\n/gm,
    '',
  )

  // 3. Rename caution → warning (erudocs Callout has warning, not caution).
  out = out.replace(
    /^(\s*):::caution(?=\[|\s*$)/gm,
    '$1:::warning',
  )

  // 4. Asides with title: :::variant[Title] → <Callout variant="x" title="Title">
  out = out.replace(
    /^(\s*):::(note|tip|warning|danger)\[([^\]\n]+)\]\s*$/gm,
    '$1<Callout variant="$2" title="$3">\n',
  )

  // 5. Asides without title: :::variant → <Callout variant="x">
  out = out.replace(
    /^(\s*):::(note|tip|warning|danger)\s*$/gm,
    '$1<Callout variant="$2">\n',
  )

  // 6. Closing ::: → </Callout>
  out = out.replace(/^(\s*):::\s*$/gm, '\n$1</Callout>')

  // 7. Collapse runs of 3+ blank lines to 2 (tidy).
  out = out.replace(/\n{3,}/g, '\n\n')

  // 8. Inject imports for any custom components used in the body.
  const bodyStart = (() => {
    if (!out.startsWith('---')) return 0
    const end = out.indexOf('\n---', 3)
    return end === -1 ? 0 : end + 4
  })()
  const body = out.slice(bodyStart)
  const imports = []
  for (const [name, stmt] of Object.entries(COMPONENT_IMPORTS)) {
    const re = new RegExp(`<${name}(\\s|>|/)`)
    if (re.test(body)) imports.push(stmt)
  }
  if (imports.length > 0) {
    const frontmatter = out.slice(0, bodyStart)
    const rest = out.slice(bodyStart).replace(/^\n+/, '')
    out = `${frontmatter}\n\n${imports.join('\n')}\n\n${rest}`
  }

  return out
}

const files = await walk(CONTENT_DIR)
let changed = 0
for (const file of files) {
  const before = await readFile(file, 'utf8')
  const after = transform(before)
  if (after !== before) {
    await writeFile(file, after)
    changed++
  }
}
console.log(`Transformed ${changed}/${files.length} files`)

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ICONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../assets/icons",
)

export const loadIcon = (path: string) =>
  readFileSync(join(ICONS_DIR, `${path}.svg`), "utf8")
    .replace("<svg", '<svg aria-hidden="true"')
    .replace(/\s+/g, " ")
    .trim()

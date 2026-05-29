import { readdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AstroIntegration } from 'astro'

const SCRIPT_OPEN_TAG = /<script(?![^>]*\bdata-cfasync=)([^>]*)>/gi

async function htmlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true })
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith('.html'))
    .map(entry => path.join(entry.parentPath, entry.name))
}

export function disableRocketLoader(): AstroIntegration {
  return {
    name: 'disable-rocket-loader',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const root = fileURLToPath(dir)
        const files = await htmlFiles(root)
        let patched = 0
        await Promise.all(
          files.map(async file => {
            const original = await readFile(file, 'utf8')
            const next = original.replace(SCRIPT_OPEN_TAG, '<script data-cfasync="false"$1>')
            if (next === original) return
            await writeFile(file, next)
            patched++
          })
        )
      },
    },
  }
}

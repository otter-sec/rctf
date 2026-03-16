import { join } from 'path'
import { Glob } from 'bun'

export async function rewriteUrls(
  outputDir: string,
  urlMap: Map<string, string>
): Promise<void> {
  if (urlMap.size === 0) {
    return
  }

  const glob = new Glob('**/*.json')
  const apiDataDir = join(outputDir, 'api-data')
  const entries: string[] = []

  for await (const path of glob.scan({ cwd: apiDataDir })) {
    entries.push(join(apiDataDir, path))
  }

  console.log(`  Rewriting URLs in ${entries.length} JSON files...`)

  for (const filePath of entries) {
    let content = await Bun.file(filePath).text()
    let changed = false

    for (const [original, local] of urlMap) {
      if (content.includes(original)) {
        content = content.replaceAll(original, local)
        changed = true
      }
    }

    if (changed) {
      await Bun.write(filePath, content)
    }
  }
}

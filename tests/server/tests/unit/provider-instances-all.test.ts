import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const instancesDir = path.resolve(
  import.meta.dir,
  '../../../../apps/api/src/providers/instances'
)

describe('provider instances', () => {
  test('all.ts imports every instance module', () => {
    const source = readFileSync(path.join(instancesDir, 'all.ts'), 'utf8')
    const modules = readdirSync(instancesDir).filter(
      name => name.endsWith('.ts') && name !== 'all.ts' && name !== 'load.ts'
    )

    expect(modules.length).toBeGreaterThan(0)
    for (const name of modules) {
      expect(source).toContain(`'./${name.replace(/\.ts$/, '')}'`)
    }
  })
})

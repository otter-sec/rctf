import { describe, expect, test } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

describe('CLI noninteractive inputs', () => {
  test('fails when required positional inputs are missing', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'rctf-admin-bot-cli-'))
    const configPath = join(directory, 'bot.ts')
    await writeFile(
      configPath,
      `
        const { Challenge } = require('../types')
        export const challenge = new Challenge({
          timeoutMilliseconds: 5000,
          inputs: {
            url: { pattern: '^https?://' },
            token: { pattern: '.+' },
          },
          handler: async () => {},
        })
      `
    )

    try {
      const child = Bun.spawn(
        [process.execPath, 'src/cli.ts', '--local', configPath],
        {
          cwd: join(import.meta.dir, '..'),
          stdin: 'ignore',
          stdout: 'pipe',
          stderr: 'pipe',
        }
      )
      const [exitCode, stdout, stderr] = await Promise.all([
        child.exited,
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
      ])

      expect(exitCode).toBe(1)
      expect(`${stdout}\n${stderr}`).toContain(
        'Missing required input arguments: url, token'
      )
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})

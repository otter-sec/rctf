import fs from 'fs'
import os from 'os'
import path from 'path'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import LocalProvider from '../../../../apps/api/src/providers/uploads/local'

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rctf-uploads-test-'))
const uploadDirectory = path.join(root, 'uploads')
const provider = new LocalProvider({ uploadDirectory })
const app = new Hono()

beforeAll(async () => {
  await provider.startupWebPart(app as any)
  fs.writeFileSync(path.join(root, 'secret.txt'), 'secret')
})

afterAll(() => {
  fs.rmSync(root, { recursive: true, force: true })
})

describe('local upload provider', () => {
  test('serves filenames with URL-reserved characters', async () => {
    for (const name of ['!&+.%%_x', '100%.txt']) {
      const url = await provider.uploadFile(
        Buffer.from(name),
        `somehash/${name}`
      )
      const res = await app.request(url)
      expect(res.status).toBe(200)
      expect(await res.text()).toBe(name)
    }
  })

  test('does not serve files outside the upload directory', async () => {
    const target = path.join(uploadDirectory, '..', 'secret.txt')
    expect(await Bun.file(target).exists()).toBe(true)

    for (const evil of ['..%2Fsecret.txt', '%2e%2e%2fsecret.txt']) {
      const res = await app.request(`/uploads/${evil}`)
      expect(res.status).toBe(404)
    }
  })
})

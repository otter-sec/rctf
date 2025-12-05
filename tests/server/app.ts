import type { Hono } from 'hono'
import { setupApp } from '../../apps/api/src/index'

let appPromise: ReturnType<typeof setupApp> | null = null
export const getApp = () => {
  if (!appPromise) {
    appPromise = setupApp()
  }
  return appPromise
}

export const request = async (
  app: Hono<any>,
  path: string,
  options: RequestInit
) => {
  return await app.request(path, options, {
    // https://github.com/honojs/hono/issues/3460
    server: {
      requestIP: () => {
        return {
          address: '127.0.0.1',
          family: 'local',
          port: '1337',
        }
      },
    },
  })
}

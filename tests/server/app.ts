import type { Hono } from 'hono'
import {
  registerErrorHandlers,
  setupFullApiApp,
} from '../../apps/api/src/index'

let appPromise: ReturnType<typeof setupFullApiApp> | null = null
export const getApp = () => {
  if (!appPromise) {
    appPromise = setupFullApiApp().then(value => registerErrorHandlers(value))
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

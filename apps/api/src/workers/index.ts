import { config } from '@rctf/config'
import pino from 'pino'

let leaderboardWorker: Worker | undefined

const startWorker = (logger: pino.Logger, fileName: string, name: string) => {
  const workerUrl = new URL(fileName, import.meta.url).href

  const w = new Worker(workerUrl, { type: 'module', name })
  logger.info({ workerUrl }, `started ${name} worker`)
  return w
}

export const startLeaderboardWorker = (logger: pino.Logger) => {
  leaderboardWorker = startWorker(
    logger,
    './leaderboard.ts',
    'leaderboard-worker'
  )
}

export const forceLeaderboardUpdate = (): void => {
  try {
    leaderboardWorker?.postMessage({ type: 'force-update' })
  } catch (error) {
    console.error('Error forcing leaderboard update', error)
  }
}

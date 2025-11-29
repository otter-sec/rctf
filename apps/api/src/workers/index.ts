import pino from 'pino'

const workerExt = process.env.WORKER_EXTENSION ?? '.ts'
let leaderboardWorker: Worker | undefined

const startWorker = (logger: pino.Logger, fileName: string, name: string) => {
  const workerUrl = new URL(fileName, import.meta.url).href

  const w = new Worker(workerUrl, { type: 'module', name })
  w.addEventListener('error', event => {
    logger.error({ workerUrl, error: event.message }, `${name} worker error`)
  })

  logger.info({ workerUrl }, `started ${name} worker`)
  return w
}

export const startLeaderboardWorker = (logger: pino.Logger) => {
  leaderboardWorker = startWorker(
    logger,
    `./leaderboard${workerExt}`,
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

import { pino, type DestinationStream } from 'pino'

const options = (level: string) => ({
  level,
  redact: [
    'flag',
    'flags[*].flag',
    'input.*',
    'inputs.*',
    'job.flag',
    'job.flags[*].flag',
    'job.inputs.*',
  ],
})

export const createRootLogger = (
  destination?: DestinationStream,
  level = process.env.LOG_LEVEL ?? 'info'
) => (destination ? pino(options(level), destination) : pino(options(level)))

const root = createRootLogger()

export const createLogger = (module: string) => root.child({ module })

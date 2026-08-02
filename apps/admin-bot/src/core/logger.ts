import { sensitiveLogPaths } from '@rctf/util'
import { pino, type DestinationStream } from 'pino'

const redact = [
  ...sensitiveLogPaths,
  'job.flag',
  'job.flags[*].flag',
  'job.inputs',
]

export const createRootLogger = (
  destination?: DestinationStream,
  level = process.env.LOG_LEVEL ?? 'info'
) => pino({ level, redact }, destination)

const root = createRootLogger()

export const createLogger = (module: string) => root.child({ module })

// Error messages may contain participant data, so expose only the type.
export const errorSummary = (err: unknown) => ({
  errorType: err instanceof Error ? err.name : typeof err,
})

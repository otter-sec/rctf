import { DrizzleQueryError } from 'drizzle-orm'
import pino, { type DestinationStream } from 'pino'

const redact = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["proxy-authorization"]',
  'flag',
  'submittedFlag',
  'details.submittedFlag',
  'flags[*].flag',
  'input',
  'inputs',
  'job.flag',
  'job.flags[*].flag',
  'job.inputs',
  'req.body.flag',
  'req.body.submittedFlag',
  'req.body.flags[*].flag',
  'req.body.input',
  'req.body.inputs',
  'err.query',
  'err.params',
  'error.query',
  'error.params',
]

type QueryError = Error & {
  query: string
  params: unknown[]
  cause?: Error & {
    code?: unknown
    constraint?: unknown
    constraint_name?: unknown
  }
}

const isQueryError = (error: unknown): error is QueryError =>
  error instanceof DrizzleQueryError ||
  (error instanceof Error &&
    typeof (error as Partial<QueryError>).query === 'string' &&
    Array.isArray((error as Partial<QueryError>).params))

const stringProperty = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const sanitizedStack = (error: Error): string | undefined => {
  const frames = error.stack
    ?.split('\n')
    .filter(line => /^\s+at\s/.test(line))
    .join('\n')
  return frames ? `${error.name}: Database query failed\n${frames}` : undefined
}

const serializeError = (error: unknown) => {
  if (!isQueryError(error)) {
    return pino.stdSerializers.err(error as Error)
  }

  const code = stringProperty(error.cause?.code)
  const constraint = stringProperty(
    error.cause?.constraint_name ?? error.cause?.constraint
  )
  return {
    type: 'DrizzleQueryError',
    message: 'Database query failed',
    stack: sanitizedStack(error),
    ...(code ? { code } : {}),
    ...(constraint ? { constraint } : {}),
  }
}

const options = (level: string) => ({
  level,
  redact,
  serializers: { err: serializeError, error: serializeError },
})

export const createApiLogger = (
  destination?: DestinationStream,
  level = process.env.LOG_LEVEL ??
    (Bun.env.NODE_ENV === 'production' ? 'info' : 'trace')
) => (destination ? pino(options(level), destination) : pino(options(level)))

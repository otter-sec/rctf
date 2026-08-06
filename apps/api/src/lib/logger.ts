import { sensitiveLogPaths } from '@rctf/util'
import { DrizzleQueryError } from 'drizzle-orm'
import pino, { type DestinationStream } from 'pino'

const redact = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["proxy-authorization"]',
  ...sensitiveLogPaths,
  // backstop for non-Error values logged under err/error, which skip the serializer
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

const isQueryError = (error: Error): error is QueryError =>
  error instanceof DrizzleQueryError ||
  (typeof (error as Partial<QueryError>).query === 'string' &&
    Array.isArray((error as Partial<QueryError>).params))

const findQueryError = (error: Error): QueryError | undefined => {
  const seen = new Set<Error>()
  let current: unknown = error
  while (current instanceof Error && !seen.has(current)) {
    if (isQueryError(current)) {
      return current
    }
    seen.add(current)
    current = current.cause
  }
  return undefined
}

const stringProperty = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const sanitizedStack = (error: Error): string | undefined => {
  const frames = error.stack
    ?.split('\n')
    .filter(line => /^\s+at\s/.test(line))
    .join('\n')
  return frames
    ? `DrizzleQueryError: Failed query (parameters redacted)\n${frames}`
    : undefined
}

// Query errors embed bound parameters (flags, inputs) in message and params.
// Keep the parameterized query for diagnostics without logging those values.
const serializeError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return pino.stdSerializers.err(error as Error)
  }
  const queryError = findQueryError(error)
  if (!queryError) {
    return pino.stdSerializers.err(error)
  }
  return {
    type: 'DrizzleQueryError',
    message: `Failed query: ${queryError.query}`,
    stack: sanitizedStack(error),
    code: stringProperty(queryError.cause?.code),
    constraint: stringProperty(
      queryError.cause?.constraint_name ?? queryError.cause?.constraint
    ),
  }
}

export const createApiLogger = (
  destination?: DestinationStream,
  level = process.env.LOG_LEVEL ??
    (Bun.env.NODE_ENV === 'production' ? 'info' : 'trace')
) =>
  pino(
    {
      level,
      redact,
      serializers: { err: serializeError, error: serializeError },
    },
    destination
  )

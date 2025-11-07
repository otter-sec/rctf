import { DrizzleQueryError } from 'drizzle-orm'
import postgres from 'postgres'

export const getErrorConstraint = (error: any): string | undefined => {
  if (!(error instanceof DrizzleQueryError)) {
    return undefined
  }
  if (!(error.cause instanceof postgres.PostgresError)) {
    return undefined
  }
  return error.cause.constraint_name
}

export const takeUnique = <T extends any[]>(
  values: T
): T[number] | undefined => {
  if (values.length !== 1) {
    return undefined
  }
  return values[0]
}

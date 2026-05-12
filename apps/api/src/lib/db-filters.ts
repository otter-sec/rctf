import { inArray, notInArray, type SQL } from 'drizzle-orm'

export const setFilter = <T>(
  column: SQL<unknown>,
  filter?: { include?: T[] | null; exclude?: T[] | null } | null
): (SQL | undefined)[] => [
  filter?.include?.length ? inArray(column, filter.include) : undefined,
  filter?.exclude?.length ? notInArray(column, filter.exclude) : undefined,
]

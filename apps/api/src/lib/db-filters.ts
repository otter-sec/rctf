import { and, eq, gt, inArray, notInArray, or, type SQL } from 'drizzle-orm'
import type { PgColumn } from 'drizzle-orm/pg-core'

export const setFilter = <T>(
  column: SQL<unknown>,
  filter?: { include?: T[] | null; exclude?: T[] | null } | null
): (SQL | undefined)[] => [
  filter?.include?.length ? inArray(column, filter.include) : undefined,
  filter?.exclude?.length ? notInArray(column, filter.exclude) : undefined,
]

export type RowCursor = { time: string; id: string }
export const cursorAfter = (
  timeCol: PgColumn,
  idCol: PgColumn,
  cursor: RowCursor | null
): SQL | undefined =>
  cursor
    ? or(
        gt(timeCol, cursor.time),
        and(eq(timeCol, cursor.time), gt(idCol, cursor.id))
      )
    : undefined

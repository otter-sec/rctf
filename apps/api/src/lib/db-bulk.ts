import { sql, type AnyColumn, type Placeholder, type SQL } from 'drizzle-orm'

// keeps row-count x column-count safely under the postgres wire-protocol
// limit of 65534 bind parameters per statement
const INSERT_CHUNK_SIZE = 1_000

export const insertInChunks = async <T>(
  rows: T[],
  insert: (chunk: T[]) => Promise<unknown>,
  chunkSize = INSERT_CHUNK_SIZE
): Promise<void> => {
  for (let index = 0; index < rows.length; index += chunkSize) {
    await insert(rows.slice(index, index + chunkSize))
  }
}

// inArray() binds one parameter per element and overflows the protocol limit
export const inJsonbArray = (column: AnyColumn | SQL, values: string[]): SQL =>
  sql`${column} IN (SELECT jsonb_array_elements_text(${JSON.stringify(values)}::jsonb))`

export const inJsonbArrayPlaceholder = (
  column: AnyColumn | SQL,
  placeholder: Placeholder
): SQL =>
  sql`${column} IN (SELECT jsonb_array_elements_text(${placeholder}::jsonb))`

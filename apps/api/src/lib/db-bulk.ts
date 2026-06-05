import { sql, type AnyColumn, type SQL } from 'drizzle-orm'

// keeps row-count x column-count safely under the postgres wire-protocol
// limit of 65534 bind parameters per statement
const INSERT_CHUNK_SIZE = 1_000

export const insertInChunks = async <T>(
  rows: T[],
  insert: (chunk: T[]) => Promise<unknown>
): Promise<void> => {
  for (let index = 0; index < rows.length; index += INSERT_CHUNK_SIZE) {
    await insert(rows.slice(index, index + INSERT_CHUNK_SIZE))
  }
}

// inArray() binds one parameter per element and overflows the protocol limit
export const inJsonbArray = (column: AnyColumn | SQL, values: string[]): SQL =>
  sql`${column} IN (SELECT jsonb_array_elements_text(${JSON.stringify(values)}::jsonb))`

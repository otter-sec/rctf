import type { DatabaseClient } from '@rctf/db'

export const preparedPerDb = <T>(build: (db: DatabaseClient) => T) => {
  const cache = new WeakMap<DatabaseClient, T>()
  return (db: DatabaseClient): T => {
    let prepared = cache.get(db)
    if (!prepared) {
      prepared = build(db)
      cache.set(db, prepared)
    }
    return prepared
  }
}

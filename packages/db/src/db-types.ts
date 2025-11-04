import { customType } from 'drizzle-orm/pg-core'

export const citext = customType<{ data: string }>({
  dataType() {
    return 'citext'
  },
})

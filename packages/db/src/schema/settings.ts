import { jsonb, pgTable, text } from 'drizzle-orm/pg-core'

export interface EditableSponsor {
  name: string
  icon: string
  description: string
  url?: string
}

export interface EditableSettings {
  ctfName?: string
  homeContent?: string
  sponsors?: EditableSponsor[]
  meta?: {
    description?: string
    imageUrl?: string
  }
  faviconUrl?: string
}

export const settings = pgTable('settings', {
  id: text().primaryKey().notNull(),
  data: jsonb().$type<EditableSettings>().notNull(),
})

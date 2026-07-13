import { jsonb, pgTable, text } from 'drizzle-orm/pg-core'

export interface EditableSponsor {
  name: string
  iconLight: string
  iconDark: string
  description: string
  url?: string
}

export interface EditableSettings {
  ctfName?: string
  homeContent?: string
  startTime?: number
  endTime?: number
  sponsors?: EditableSponsor[]
  meta?: {
    description?: string
    imageUrl?: string
  }
  faviconUrl?: string
  logoLightUrl?: string
  logoDarkUrl?: string
}

export const settings = pgTable('settings', {
  id: text().primaryKey().notNull(),
  data: jsonb().$type<EditableSettings>().notNull(),
})

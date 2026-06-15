import { glob } from "astro/loaders"
import { defineCollection } from "astro:content"
import { z } from "astro/zod"

const docs = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.md",
    base: "./src/content/docs",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    order: z.number().optional(),
    draft: z.boolean().optional(),
    scroll: z.boolean().optional(),
    aside: z.boolean().optional(),
    lastUpdated: z.coerce.date().optional(),
    editUrl: z.url().or(z.literal(false)).optional(),
  }),
})

export const collections = { docs }

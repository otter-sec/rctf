import type { z } from 'zod/mini'

export const formatZodIssues = (error: z.core.$ZodError): string =>
  error.issues
    .map(issue => `${issue.path.join('.')}: ${issue.message}`)
    .join(', ')

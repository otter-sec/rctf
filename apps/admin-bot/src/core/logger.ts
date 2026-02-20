import { pino } from 'pino'

const root = pino({ level: process.env.LOG_LEVEL ?? 'info' })

export const createLogger = (module: string) => root.child({ module })

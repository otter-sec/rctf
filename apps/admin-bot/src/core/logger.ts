import { pino } from 'pino'

const root = pino()

export const createLogger = (module: string) => root.child({ module })

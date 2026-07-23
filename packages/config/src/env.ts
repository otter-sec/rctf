const TRUTHY_ENV_VALUES = new Set(['true', 'yes', 'y', '1'])

export const getEnvString = (key: string): string | undefined =>
  process.env[key]
export const getEnvInteger = (key: string): number | undefined =>
  process.env[key] ? Number.parseInt(process.env[key].trim()) : undefined
export const getEnvBoolean = (key: string): boolean | undefined =>
  process.env[key]
    ? TRUTHY_ENV_VALUES.has(process.env[key].trim().toLowerCase())
    : undefined

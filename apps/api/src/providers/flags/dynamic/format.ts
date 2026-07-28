export enum DynamicFlagMode {
  AUTO = 'auto',
  LEET = 'leet',
  TAIL = 'tail',
}

export enum DynamicFlagExhaustion {
  TAIL = 'tail',
  DUPLICATE = 'duplicate',
}

export type Carrier = DynamicFlagMode.LEET | DynamicFlagMode.TAIL
export const DYNAMIC_FLAG_MIN_BITS = 20
export const TAIL_BYTES = 5

export interface ParsedDynamicFlag {
  prefix: string
  content: string
}

const FLAG_PATTERN = /^([^{]+)\{([\x20-\x7e]*)\}(?![\s\S])/

export const parseDynamicFlag = (flag: string): ParsedDynamicFlag | null => {
  const match = FLAG_PATTERN.exec(flag)
  if (!match) {
    return null
  }
  return { prefix: match[1]!, content: match[2]! }
}

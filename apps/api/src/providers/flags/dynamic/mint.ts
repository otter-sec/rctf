import {
  type Carrier,
  DynamicFlagMode,
  type ParsedDynamicFlag,
  parseDynamicFlag,
} from './format'
import { leetCapable, randomizeLeet } from './leet'
import { randomizeTail } from './tail'

export const pickCarrier = (
  parsed: ParsedDynamicFlag,
  mode: DynamicFlagMode
): Carrier | null => {
  if (mode === DynamicFlagMode.TAIL) {
    return DynamicFlagMode.TAIL
  }
  if (leetCapable(parsed.content)) {
    return DynamicFlagMode.LEET
  }
  return mode === DynamicFlagMode.AUTO ? DynamicFlagMode.TAIL : null
}

export const randomizeFlag = (
  parsed: ParsedDynamicFlag,
  carrier: Carrier
): string => {
  if (carrier === DynamicFlagMode.LEET) {
    return randomizeLeet(parsed)
  }
  return randomizeTail(parsed)
}

export const mintDynamicFlag = (
  base: string,
  mode: DynamicFlagMode
): string | null => {
  const parsed = parseDynamicFlag(base)
  if (!parsed) {
    return null
  }

  const carrier = pickCarrier(parsed, mode)
  if (carrier === null) {
    return null
  }
  return randomizeFlag(parsed, carrier)
}

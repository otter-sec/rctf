import { timingSafeEqual } from '../../util/timing-safe-equal'
import { DynamicFlagResult } from './result'
import { createHash } from 'node:crypto'

export const verifyDefaultFlag = (flag: string, submitted: string): boolean => {
  return timingSafeEqual(flag, submitted)
}

const leetspeakChars: Record<string, Array<string>> = {
  a: ['a', '4'],
  b: ['b', 'B'],
  c: ['c', 'C'],
  d: ['d', 'D'],
  e: ['e', 'E'],
  f: ['f', 'F'],
  g: ['g', 'G'],
  h: ['h', 'H'],
  i: ['i', '1'],
  j: ['j', 'J'],
  k: ['k', 'K'],
  l: ['l', 'L'],
  m: ['m', 'M'],
  n: ['n', 'N'],
  o: ['o', '0'],
  p: ['p', 'P'],
  q: ['q', 'Q'],
  r: ['r', 'R'],
  s: ['s', '5'],
  t: ['t', '7'],
  u: ['u', 'U'],
  v: ['v', 'V'],
  w: ['w', 'W'],
  x: ['x', 'X'],
  y: ['y', 'Y'],
  z: ['z', 'Z'],
}

function countEncodableChars(content: string): number {
  let encodableChars = 0
  for (const c of content) {
    if (Object.hasOwn(leetspeakChars, c)) {
      encodableChars++
    }
  }
  return encodableChars
}

export const generateDynamicFlag = (
  baseFlag: string,
  teamId: string,
  challengeId: string,
  signingMode: string,
  signingKey: string
): string => {
  let baseFlagStripped = baseFlag.match(/{.*}/) || []
  if (baseFlagStripped.length != 1) {
    throw new Error(`invalid flag format: ${baseFlag}`)
  }

  let flagFormat = baseFlag.split('{')[0]
  let baseFlagContent = baseFlagStripped[0].slice(1, -1)

  let encodedFlagContent = ''

  switch (signingMode) {
    case 'leet':
      let teamIdNum = BigInt('0x' + teamId.replace(/-/g, ''))
      let sig = createHash('sha256')
        .update(`${baseFlag}:${teamId}:${signingKey}`)
        .digest('hex')
      let sigNum = BigInt('0x' + sig)

      let numEncodableChars = countEncodableChars(baseFlagContent)

      if (numEncodableChars < 14) {
        throw new Error(
          `flag ${baseFlag} doesn't have enough encodable characters`
        )
      }

      let numTeamIdBits = Math.floor((numEncodableChars - 14) / 2) + 14
      let numSigBits = Math.ceil((numEncodableChars - 14) / 2)

      if (numTeamIdBits > 128) {
        numSigBits += numTeamIdBits - 128
        numTeamIdBits = 128
      }

      if (numSigBits > 256) {
        numSigBits = 256
      }

      let bitNum = 0
      for (const c of baseFlagContent) {
        if (Object.hasOwn(leetspeakChars, c)) {
          let bitVal = 0
          if (bitNum < numTeamIdBits) {
            bitVal = Number((teamIdNum >> BigInt(bitNum)) & BigInt(1))
          } else if (bitNum < numTeamIdBits + numSigBits) {
            bitVal = Number(
              (sigNum >> BigInt(bitNum - numTeamIdBits)) & BigInt(1)
            )
          } else {
            bitVal =
              createHash('sha256').update(encodedFlagContent).digest()[0]! & 1
          }
          encodedFlagContent += leetspeakChars[c]![bitVal]
          bitNum++
        } else {
          encodedFlagContent += c
        }
      }
      break

    case 'basic':
      if (baseFlagContent.length > 0) {
        encodedFlagContent = `${baseFlagContent}:${teamId.replace(/-/g, '')}`
      } else {
        encodedFlagContent = teamId.replace(/-/g, '')
      }

      encodedFlagContent = `${encodedFlagContent}:${createHash('sha256').update(`${baseFlag}:${challengeId}:${encodedFlagContent}:${signingKey}`).digest('hex')}`

      break
  }

  let encodedFlag = `${flagFormat}{${encodedFlagContent}}`

  return encodedFlag
}

export const verifyDynamicFlag = (
  baseFlag: string,
  teamId: string,
  challengeId: string,
  submitted: string,
  signingMode: string,
  signingKey: string
): DynamicFlagResult => {
  if (
    generateDynamicFlag(
      baseFlag,
      teamId,
      challengeId,
      signingMode,
      signingKey
    ) === submitted
  ) {
    return DynamicFlagResult.Valid
  }

  let baseFlagStripped = baseFlag.match(/{.*}/) || []
  if (baseFlagStripped.length != 1) {
    throw new Error(`invalid flag format: ${baseFlag}`)
  }

  let submittedFlagStripped = submitted.match(/{.*}/) || []
  if (submittedFlagStripped.length != 1) {
    return DynamicFlagResult.Invalid
  }

  let baseFlagContent = baseFlagStripped[0].slice(1, -1)
  let submittedFlagContent = submittedFlagStripped[0].slice(1, -1)

  switch (signingMode) {
    case 'leet':
      if (baseFlagContent.length != submittedFlagContent.length) {
        return DynamicFlagResult.Invalid
      }
      for (let i = 0; i < baseFlagContent.length; i++) {
        let submittedChar = submittedFlagContent[i]!
        let baseChar = baseFlagContent[i]!
        if (Object.hasOwn(leetspeakChars, baseChar)) {
          if (!leetspeakChars[baseChar]?.includes(submittedChar)) {
            return DynamicFlagResult.Invalid
          }
        } else {
          if (submittedChar !== baseChar) {
            return DynamicFlagResult.Invalid
          }
        }
      }
      break

    case 'basic':
      let submittedFlagContentChunks = submittedFlagContent.split(':')

      if (submittedFlagContentChunks.length < 3) {
        return DynamicFlagResult.Invalid
      }

      let submittedFlagStripped = submittedFlagContentChunks
        .slice(0, -2)
        .join(':')

      if (submittedFlagStripped !== baseFlagContent) {
        return DynamicFlagResult.Invalid
      }
      break
  }

  return DynamicFlagResult.ValidBaseWrongTeamOrSig
}

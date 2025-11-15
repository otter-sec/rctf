const timingSafeEqual = (a: string, b: string): boolean => {
  const aBuf = new TextEncoder().encode(a)
  const bBuf = new TextEncoder().encode(b)
  if (aBuf.length !== bBuf.length) {
    return false
  }

  let out = 0
  for (let i = 0; i < aBuf.length; i++) {
    out |= aBuf[i]! ^ bBuf[i]!
  }
  return out === 0
}

export const verifyDefaultFlag = (flag: string, submitted: string): boolean => {
  return timingSafeEqual(flag, submitted)
}

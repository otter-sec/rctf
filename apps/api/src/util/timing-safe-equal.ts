// not using crypto.timingSafeEqual because it doesn't support comparing
// strings of different sizes
export const timingSafeEqual = (a: string, b: string): boolean => {
  const aBuf = new TextEncoder().encode(a)
  const bBuf = new TextEncoder().encode(b)

  let out = aBuf.length ^ bBuf.length
  for (let i = 0; i < Math.max(aBuf.length, bBuf.length); i++) {
    out |= (aBuf[i] ?? 0) ^ (bBuf[i] ?? 0)
  }
  return out === 0
}

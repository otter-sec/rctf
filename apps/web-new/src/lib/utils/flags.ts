export function countryCodeToFlagFilename(code: string): string {
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(char => (char.charCodeAt(0) + 127397).toString(16))
  return `${codePoints.join('-')}.svg`
}

/**
 * Small formatting helpers shared by the profile charts. Kept DOM-free so the
 * bar/dot charts and the score graph render identical axis labels.
 */

/** Abbreviates thousands as `1.5k`; passes small values through unchanged. */
export function compactNumber(value: number): string {
  if (value >= 1000) {
    const thousands = value / 1000
    return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`
  }
  return `${value}`
}

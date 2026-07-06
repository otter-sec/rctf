import { ALL_REGIONS } from '@rctf/util'

/** Sentinel for the "clear" row; kept non-empty so the combobox treats it as a
 * real selection (an empty-string value reads as "no selection"). */
export const NO_COUNTRY_VALUE = '__none__'

export type RegionItem = {
  value: string
  label: string
}

/** The clear row followed by every region, in the canonical region order. */
export function buildRegionItems(noCountryLabel: string): RegionItem[] {
  return [
    { value: NO_COUNTRY_VALUE, label: noCountryLabel },
    ...ALL_REGIONS.map(region => ({ value: region.code, label: region.name })),
  ]
}

/** Map an outward country code (or null) to the combobox's internal value. */
export function toComboboxValue(code: string | null): string {
  return code ?? NO_COUNTRY_VALUE
}

/** Map the combobox's internal value back to an outward country code or null. */
export function fromComboboxValue(value: string | null): string | null {
  return value === null || value === NO_COUNTRY_VALUE ? null : value
}

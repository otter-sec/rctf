import { ALL_REGIONS } from '@rctf/util'

export const NO_COUNTRY_VALUE = 'none'

export type RegionItem = {
  value: string
  label: string
}

export function buildRegionItems(noCountryLabel: string): RegionItem[] {
  return [
    { value: NO_COUNTRY_VALUE, label: noCountryLabel },
    ...ALL_REGIONS.map(region => ({ value: region.code, label: region.name })),
  ]
}

export function toComboboxValue(code: string | null): string {
  return code ?? NO_COUNTRY_VALUE
}

export function fromComboboxValue(value: string | null): string | null {
  return value === null || value === NO_COUNTRY_VALUE ? null : value
}

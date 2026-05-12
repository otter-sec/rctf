import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export * from './utils/initials'
export * from './utils/time'
export * from './utils/rank'
export * from './utils/flags'
export * from '@rctf/util'
export * from './utils/categories'
export * from './utils/filesize'
export * from './utils/captcha'
export * from './utils/permissions'
export * from './utils/virtualizer.svelte'
export * from './utils/hover-tooltip.svelte'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any }
  ? Omit<T, 'children'>
  : T
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & {
  ref?: U | null
}

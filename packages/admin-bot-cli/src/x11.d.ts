declare module 'x11' {
  export interface ParsedDisplay {
    display: string
    protocol: string
    host: string
    displayNum: string
    screenNum: string | number
  }

  export function parseDisplay(display: string): ParsedDisplay
}

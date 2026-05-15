import { ensureColorContrastOnBackground, ExpressiveCodeTheme } from '@expressive-code/core'
import materialThemeDarkerRaw from '@shikijs/themes/material-theme-darker'
import materialThemeLighterRaw from '@shikijs/themes/material-theme-lighter'

export const CODE_BACKGROUND_LIGHT = '#fafafa'
export const CODE_BACKGROUND_DARK = '#151515'

const isLightTheme = (theme: { name: string }) => theme.name === 'material-theme-lighter'
export const codeBackground = (theme: { name: string }) =>
  isLightTheme(theme) ? CODE_BACKGROUND_LIGHT : CODE_BACKGROUND_DARK

// Pre-adjusting against the same background used by Expressive Code's style
// overrides means EC's per-render adjustment is a no-op (already meets
// contrast), and inline shiki — which has no contrast pipeline — sees the same
// colors.
const MIN_CONTRAST = 5.5

// `ensureMinSyntaxHighlightingColorContrast` only walks tokenColor settings
// and `editor.foreground`. The 16 ANSI palette entries live in `colors`
// and drive `{:ansi}` rendering for both EC terminals and inline shiki, so
// adjust them with the same algorithm against the same background.
const ANSI_COLOR_KEYS = [
  'terminal.ansiBlack',
  'terminal.ansiRed',
  'terminal.ansiGreen',
  'terminal.ansiYellow',
  'terminal.ansiBlue',
  'terminal.ansiMagenta',
  'terminal.ansiCyan',
  'terminal.ansiWhite',
  'terminal.ansiBrightBlack',
  'terminal.ansiBrightRed',
  'terminal.ansiBrightGreen',
  'terminal.ansiBrightYellow',
  'terminal.ansiBrightBlue',
  'terminal.ansiBrightMagenta',
  'terminal.ansiBrightCyan',
  'terminal.ansiBrightWhite',
] as const

function adjustAnsiPalette(theme: ExpressiveCodeTheme, background: string): void {
  for (const key of ANSI_COLOR_KEYS) {
    const color = theme.colors[key]
    if (!color) continue
    theme.colors[key] = ensureColorContrastOnBackground(color, background, MIN_CONTRAST)
  }
}

function adjusted(raw: unknown): ExpressiveCodeTheme {
  const theme = new ExpressiveCodeTheme(raw as ConstructorParameters<typeof ExpressiveCodeTheme>[0])
  const background = codeBackground(theme)
  theme.bg = background
  theme.colors['editor.background'] = background
  theme.ensureMinSyntaxHighlightingColorContrast(MIN_CONTRAST, background)
  adjustAnsiPalette(theme, background)
  return theme
}

export const lightTheme = adjusted(materialThemeLighterRaw)
export const darkTheme = adjusted(materialThemeDarkerRaw)

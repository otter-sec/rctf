import { ExpressiveCodeEngine } from '@expressive-code/core'
import { ecDefaultPlugins, ecOptions } from './ec-config'
import { darkTheme, lightTheme } from './shiki-themes'

let enginePromise: Promise<ExpressiveCodeEngine> | null = null
let stylesPromise: Promise<string> | null = null

export function getEcEngine(): Promise<ExpressiveCodeEngine> {
  if (!enginePromise) {
    enginePromise = (async () => {
      return new ExpressiveCodeEngine({
        themes: [lightTheme, darkTheme],
        ...ecOptions,
        plugins: [...ecDefaultPlugins(), ...ecOptions.plugins],
      })
    })()
  }
  return enginePromise
}

export function getEcStyles(): Promise<string> {
  if (!stylesPromise) {
    stylesPromise = (async () => {
      const engine = await getEcEngine()
      const base = await engine.getBaseStyles()
      const themes = await engine.getThemeStyles()
      return base + themes
    })()
  }
  return stylesPromise
}

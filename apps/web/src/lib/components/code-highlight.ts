import type { HighlighterCore } from 'shiki/core'

export type HighlightFn = (code: string) => string

const LANG_LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  typescript: () => import('@shikijs/langs/typescript'),
  javascript: () => import('@shikijs/langs/javascript'),
  yaml: () => import('@shikijs/langs/yaml'),
  markdown: () => import('@shikijs/langs/markdown'),
}

let corePromise: Promise<HighlighterCore> | null = null

async function loadCore(): Promise<HighlighterCore> {
  corePromise ??= (async () => {
    const [
      { createHighlighterCore },
      { createJavaScriptRegexEngine },
      light,
      dark,
    ] = await Promise.all([
      import('shiki/core'),
      import('shiki/engine/javascript'),
      import('@shikijs/themes/github-light'),
      import('@shikijs/themes/github-dark'),
    ])
    return createHighlighterCore({
      themes: [light.default, dark.default],
      langs: [],
      engine: createJavaScriptRegexEngine({ forgiving: true }),
    })
  })()
  return corePromise
}

const highlighterPromises = new Map<string, Promise<HighlightFn | null>>()

export function loadHighlighter(language: string): Promise<HighlightFn | null> {
  let promise = highlighterPromises.get(language)
  if (!promise) {
    promise = buildHighlighter(language)
    highlighterPromises.set(language, promise)
  }
  return promise
}

async function buildHighlighter(language: string): Promise<HighlightFn | null> {
  const loadLang = LANG_LOADERS[language]
  if (!loadLang) return null
  const [core, grammar] = await Promise.all([loadCore(), loadLang()])
  await core.loadLanguage(
    grammar.default as Parameters<HighlighterCore['loadLanguage']>[0]
  )
  return code =>
    core.codeToHtml(code, {
      lang: language,
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: 'light',
    })
}

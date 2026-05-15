import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections'
import { pluginFrames } from '@expressive-code/plugin-frames'
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers'
import { pluginShiki } from '@expressive-code/plugin-shiki'
import { pluginTextMarkers } from '@expressive-code/plugin-text-markers'
import { pluginShellPrompt } from './ec-shell-prompt'
import { pluginOutputSeparator } from './ec-output-separator'
import { codeBackground } from './shiki-themes'

const isLightTheme = (theme: { name: string }) => theme.name === 'material-theme-lighter'

export const ecOptionalPlugins = () => [
  pluginCollapsibleSections(),
  pluginLineNumbers(),
  pluginShellPrompt(),
  pluginOutputSeparator(),
]

export const ecDefaultPlugins = () => [pluginShiki(), pluginFrames(), pluginTextMarkers()]

export const ecOptions = {
  plugins: ecOptionalPlugins(),
  useDarkModeMediaQuery: false,
  // Themes are pre-adjusted in shiki-themes.ts so EC and inline shiki render
  // identical colors. Skip EC's per-render readjustment, which would otherwise
  // redo the contrast pass against the codeBg override and drift EC's
  // tokens away from the inline pills.
  minSyntaxHighlightingColorContrast: 0,
  themeCssSelector: (theme: { name: string }) =>
    `[data-theme="${isLightTheme(theme) ? 'light' : 'dark'}"]`,
  defaultProps: {
    wrap: true,
    showLineNumbers: true,
    collapseStyle: 'collapsible-start' as const,
    overridesByLang: {
      'ansi,bat,bash,batch,cmd,console,powershell,ps,ps1,psd1,psm1,sh,shell,shellscript,shellsession,text,zsh':
        { showLineNumbers: false },
      'yaml,yml,toml,json,json5,jsonc,sql,graphql,markdown,mdx': { showLineNumbers: false },
    },
  },
  styleOverrides: {
    codeFontSize: '0.75rem',
    borderColor: 'var(--border)',
    borderWidth: '2px',
    codeFontFamily: 'var(--font-mono)',
    codeBackground: ({ theme }: { theme: { name: string } }) => codeBackground(theme),
    frames: {
      editorActiveTabForeground: 'var(--muted-foreground)',
      editorActiveTabBackground: ({ theme }: { theme: { name: string } }) =>
        codeBackground(theme),
      editorActiveTabIndicatorBottomColor: 'transparent',
      editorActiveTabIndicatorTopColor: 'transparent',
      editorTabBarBackground: 'transparent',
      editorTabBarBorderBottomColor: 'transparent',
      frameBoxShadowCssValue: 'none',
      terminalBackground: ({ theme }: { theme: { name: string } }) => codeBackground(theme),
      terminalTitlebarBackground: 'transparent',
      terminalTitlebarBorderBottomColor: 'transparent',
      terminalTitlebarForeground: 'var(--muted-foreground)',
    },
    lineNumbers: {
      foreground: 'var(--muted-foreground)',
    },
    collapsibleSections: {
      closedBackgroundColor: 'color-mix(in oklab, var(--foreground) 5%, transparent)',
      closedBorderColor: 'color-mix(in oklab, var(--foreground) 18%, transparent)',
      closedTextColor: 'var(--muted-foreground)',
      openBackgroundColorCollapsible: 'color-mix(in oklab, var(--foreground) 3%, transparent)',
      openBorderColor: 'transparent',
    },
    textMarkers: {
      delBackground: 'color-mix(in oklab, var(--diff-deleted) 22%, transparent)',
      delBorderColor: 'color-mix(in oklab, var(--diff-deleted) 65%, transparent)',
      delDiffIndicatorColor: 'var(--diff-deleted)',
      insBackground: 'color-mix(in oklab, var(--diff-inserted) 22%, transparent)',
      insBorderColor: 'color-mix(in oklab, var(--diff-inserted) 65%, transparent)',
      insDiffIndicatorColor: 'var(--diff-inserted)',
      markBackground: 'color-mix(in oklab, var(--accent) 12%, transparent)',
      markBorderColor: 'color-mix(in oklab, var(--accent) 50%, transparent)',
    },
    uiFontFamily: 'var(--font-sans)',
  },
}

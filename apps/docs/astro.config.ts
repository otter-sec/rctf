import { defineConfig } from 'astro/config'

import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import pagefind from 'astro-pagefind'

import { rehypeHeadingIds } from '@astrojs/markdown-remark'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeExpressiveCode from 'rehype-expressive-code'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeKatex from 'rehype-katex'
import rehypeShiki from '@shikijs/rehype'
import remarkEmoji from 'remark-emoji'
import remarkMath from 'remark-math'

import { rehypeInlineShellCmd } from './src/lib/rehype-inline-shell-cmd'
import { rehypeInlinePathIcon } from './src/lib/rehype-inline-path-icon'
import { rehypeWrapTables } from './src/lib/rehype-wrap-tables'
import { ecOptions } from './src/lib/ec-config'
import { lightTheme, darkTheme } from './src/lib/shiki-themes'
import { resolveSiteUrl } from './src/lib/site-url'

import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  site: resolveSiteUrl(),
  trailingSlash: 'always',
  integrations: [mdx(), react(), sitemap(), pagefind()],
  vite: {
    plugins: [tailwindcss()],
  },
  server: {
    port: 4321,
    host: true,
  },
  devToolbar: {
    enabled: false,
  },
  markdown: {
    syntaxHighlight: false,
    rehypePlugins: [
      [
        rehypeExternalLinks,
        {
          target: '_blank',
          rel: ['nofollow', 'noreferrer', 'noopener'],
        },
      ],
      rehypeWrapTables,
      rehypeKatex,
      [rehypeExpressiveCode, { themes: [lightTheme, darkTheme], ...ecOptions }],
      [
        rehypeShiki,
        {
          themes: { light: lightTheme, dark: darkTheme },
          inline: 'tailing-curly-colon',
        },
      ],
      rehypeInlineShellCmd,
      rehypeInlinePathIcon,
      rehypeHeadingIds,
      [
        rehypeAutolinkHeadings,
        {
          behavior: 'append',
          properties: {
            className: ['heading-anchor'],
            'aria-label': 'Link to section',
            tabindex: -1,
            'data-pagefind-ignore': '',
          },
          content: {
            type: 'text',
            value: '#',
          },
          test: (node: { tagName: string }) =>
            ['h2', 'h3', 'h4', 'h5', 'h6'].includes(node.tagName),
        },
      ],
    ],
    remarkPlugins: [remarkMath, remarkEmoji],
  },
})

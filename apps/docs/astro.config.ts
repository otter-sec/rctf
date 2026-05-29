import { rehypeHeadingIds } from '@astrojs/markdown-remark'
import mdx from '@astrojs/mdx'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import rehypeShiki from '@shikijs/rehype'
import tailwindcss from '@tailwindcss/vite'
import pagefind from 'astro-pagefind'
import { defineConfig } from 'astro/config'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeExpressiveCode from 'rehype-expressive-code'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeKatex from 'rehype-katex'
import remarkEmoji from 'remark-emoji'
import remarkMath from 'remark-math'
import { disableRocketLoader } from './src/integrations/disable-rocket-loader'
import { expressiveCodeOptions } from './src/lib/expressive-code-config'
import { rehypeCodeAnnotations } from './src/lib/rehype-code-annotations'
import { rehypeCodePathHints, rehypeCodePathIcons } from './src/lib/rehype-code-paths'
import { rehypeCopyableShellCommands } from './src/lib/rehype-copyable-shell-commands'
import { rehypeLinkIcons } from './src/lib/rehype-link-icons'
import { rehypeTableWrappers } from './src/lib/rehype-table-wrappers'
import { darkTheme, lightTheme } from './src/lib/shiki-themes'
import { resolveSiteUrl } from './src/lib/site-url'

export default defineConfig({
  site: resolveSiteUrl(),
  trailingSlash: 'always',
  integrations: [mdx(), react(), sitemap(), pagefind(), disableRocketLoader()],
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
      rehypeTableWrappers,
      rehypeKatex,
      [rehypeExpressiveCode, { themes: [lightTheme, darkTheme], ...expressiveCodeOptions }],
      rehypeCodePathHints,
      [
        rehypeShiki,
        {
          themes: { light: lightTheme, dark: darkTheme },
          inline: 'tailing-curly-colon',
        },
      ],
      rehypeCopyableShellCommands,
      rehypeCodeAnnotations,
      rehypeCodePathIcons,
      rehypeLinkIcons,
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

import { satteri } from '@astrojs/markdown-satteri'
import sitemap from '@astrojs/sitemap'
import { defineConfig } from 'astro/config'
import { apiReferenceDirectives } from './src/lib/api/directives'
import { calloutDirective } from './src/lib/callout'
import { contentDirectives } from './src/lib/directives'
import { blockExpressiveCode, inlineExpressiveCode } from './src/lib/expressive-code'
import { externalLinks } from './src/lib/external-links'
import { headingAnchors } from './src/lib/heading-anchors'
import { headingNamespace } from './src/lib/heading-namespace'
import { temmlMath } from './src/lib/math'
import { normalizeTabPanels } from './src/lib/normalize-tab-panels'
import { tableDirective, tableScroll } from './src/lib/tables'
import { unhandledDirectives } from './src/lib/unhandled-directives'

export default defineConfig({
  site: 'https://rctf.osec.io',
  prefetch: { prefetchAll: true },
  integrations: [
    sitemap({
      filter: page => !/\.(md|txt|xml|png)\/?$/.test(page),
    }),
  ],
  markdown: {
    syntaxHighlight: false,
    processor: satteri({
      features: { directive: true, math: true },
      mdastPlugins: [
        apiReferenceDirectives,
        calloutDirective,
        contentDirectives,
        inlineExpressiveCode,
        temmlMath,
        tableDirective,
        unhandledDirectives,
      ],
      hastPlugins: [
        normalizeTabPanels,
        externalLinks,
        blockExpressiveCode,
        headingNamespace,
        headingAnchors,
        tableScroll,
      ],
    }),
  },
})

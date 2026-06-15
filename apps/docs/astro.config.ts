import { defineConfig } from "astro/config"
import sitemap from "@astrojs/sitemap"
import { satteri } from "@astrojs/markdown-satteri"
import {
  blockExpressiveCode,
  inlineExpressiveCode,
} from "./src/lib/expressive-code"
import { temmlMath } from "./src/lib/math"
import { calloutDirective } from "./src/lib/callout"
import { contentDirectives } from "./src/lib/directives"
import { externalLinks } from "./src/lib/external-links"
import { headingAnchors } from "./src/lib/heading-anchors"
import { headingNamespace } from "./src/lib/heading-namespace"
import { unhandledDirectives } from "./src/lib/unhandled-directives"

export default defineConfig({
  site: "https://astro-erudite.vercel.app",
  prefetch: { prefetchAll: true },
  integrations: [
    sitemap({
      filter: (page) =>
        !/\/blog\/[^/]+\/[^/]+\/?$/.test(page) &&
        !/\/authors\/[^/]+\/?$/.test(page) &&
        !page.includes("/tags/") &&
        !page.includes("/fixtures/") &&
        !/\.(md|txt|xml)\/?$/.test(page),
    }),
  ],
  markdown: {
    syntaxHighlight: false,
    processor: satteri({
      features: { directive: true, math: true },
      mdastPlugins: [
        calloutDirective,
        contentDirectives,
        inlineExpressiveCode,
        temmlMath,
        unhandledDirectives,
      ],
      hastPlugins: [
        externalLinks,
        blockExpressiveCode,
        headingNamespace,
        headingAnchors,
      ],
    }),
  },
})

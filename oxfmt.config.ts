import { defineConfig } from 'oxfmt'

export default defineConfig({
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  semi: false,
  singleQuote: true,
  quoteProps: 'as-needed',
  trailingComma: 'es5',
  bracketSpacing: true,
  arrowParens: 'avoid',
  svelte: {},
  // Bound imports can cross side-effect imports when enabled; route
  // registration and CSS loading rely on source order.
  sortImports: false,
  sortPackageJson: false,
  sortTailwindcss: false,
  ignorePatterns: [
    'apps/docs/src/content/**/*.md',
    'apps/docs/src/content/**/*.mdx',
    'apps/web/src/styles/**',
  ],
  overrides: [
    {
      files: ['apps/docs/**/*'],
      options: {
        proseWrap: 'never',
      },
    },
  ],
})

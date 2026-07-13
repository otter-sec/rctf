import { defineConfig } from 'oxlint'

export default defineConfig({
  categories: {
    correctness: 'error',
    suspicious: 'off',
    perf: 'off',
    style: 'off',
    pedantic: 'off',
    restriction: 'off',
    nursery: 'off',
  },
  options: {
    reportUnusedDisableDirectives: 'error',
  },
})

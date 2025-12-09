import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

const DEV_API_URL = 'https://rctf-new-dev.es3n1n.io'

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: DEV_API_URL,
        changeOrigin: true,
      },
      '/uploads': {
        target: DEV_API_URL,
        changeOrigin: true,
      },
    },
  },
})

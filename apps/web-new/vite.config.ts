import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

const DEV_API_URL = 'http://localhost:3000'

export default defineConfig({
  plugins: [sveltekit()],
  server: {
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

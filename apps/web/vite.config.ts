import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// const DEV_API_URL = 'https://rctf-new-dev.es3n1n.io'
const DEV_API_URL = 'http://127.0.0.1:3000'

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
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

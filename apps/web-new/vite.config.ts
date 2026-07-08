import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

// const DEV_API_URL = 'http://localhost:3000'
// const DEV_API_URL = 'https://2026.ctf.sekai.team'
const DEV_API_URL = 'https://rctf-new-dev.es3n1n.io'

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

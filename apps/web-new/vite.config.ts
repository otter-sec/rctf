import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

const DEV_API_URL = 'https://ctf.sekai.team'

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

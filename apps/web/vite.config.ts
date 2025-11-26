import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import Icons from 'unplugin-icons/vite'
import { defineConfig, type PluginOption } from 'vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    Icons({
      compiler: 'svelte',
    }) as PluginOption,
    sveltekit(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})

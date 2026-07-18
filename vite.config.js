import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/odds-api': {
        target: 'https://api.the-odds-api.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/odds-api/, '')
      }
    }
  }
})

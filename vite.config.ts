import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: './frontend',
  base: '/',
  build: {
    outDir: './dist',
    emptyOutDir: true,
    rollupOptions: {
      input: './frontend/index.html'
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.NODE_ENV === 'production' 
          ? '/.netlify/functions'
          : 'http://localhost:3006',
        changeOrigin: true,
        rewrite: process.env.NODE_ENV === 'production' 
          ? (path) => path.replace(/^\/api/, '/api')
          : undefined
      },
      '/output': {
        target: process.env.NODE_ENV === 'production' 
          ? '/.netlify/functions'
          : 'http://localhost:3006',
        changeOrigin: true
      },
      '/reports': {
        target: process.env.NODE_ENV === 'production' 
          ? '/.netlify/functions'
          : 'http://localhost:3006',
        changeOrigin: true
      },
      '/screenshots': {
        target: process.env.NODE_ENV === 'production' 
          ? '/.netlify/functions'
          : 'http://localhost:3006',
        changeOrigin: true
      },
      '/images': {
        target: process.env.NODE_ENV === 'production' 
          ? '/.netlify/functions'
          : 'http://localhost:3006',
        changeOrigin: true
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './frontend/src')
    }
  }
}) 
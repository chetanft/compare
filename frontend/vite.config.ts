import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Default API port
const API_PORT = 3007;

// printConfig function to log configuration
function printConfig(config: any) {
  console.log('🔗 Configuring Vite with API proxy to port:', API_PORT);
  return config;
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
        secure: false,
      },
      '/reports': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
        secure: false,
      },
      '/output': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
        secure: false,
      },
      '/images': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
        secure: false,
      },
      '/screenshots': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    // Code splitting configuration to reduce bundle size
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for large dependencies
          vendor: ['react', 'react-dom', 'react-router-dom'],
          
          // UI components chunk
          ui: [
            '@heroicons/react/24/outline',
            '@heroicons/react/24/solid',
            'framer-motion',
            '@headlessui/react'
          ],
          
          // Forms and data handling
          forms: [
            '@tanstack/react-query',
            'react-hook-form'
          ]
        },
        
        // Optimize chunk size
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/[name]-[hash].js`;
        }
      }
    },
    
    // Set chunk size warning limit (reduced from default)
    chunkSizeWarningLimit: 500,
    
    // Enable minification and tree shaking
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true
      }
    },
    
    // Source maps for debugging
    sourcemap: false // Disable in production for smaller build
  },

  
  // Preview server configuration
  preview: {
    port: 4173,
    host: true
  },
  define: {
    'process.env': {}
  }
}); 
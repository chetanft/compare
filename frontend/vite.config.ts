import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// Default port for backend server
const DEFAULT_SERVER_PORT = 3007;

// Try to load server port from config.json
function getServerPortFromConfig() {
  try {
    const configPath = path.resolve(process.cwd(), '../config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config.ports?.server || DEFAULT_SERVER_PORT;
    }
  } catch (e) {
    console.warn('Failed to read port from config.json:', e);
  }
  return DEFAULT_SERVER_PORT;
}

export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '');
  
  // Get server port from environment or config
  const serverPort = parseInt(env.VITE_SERVER_PORT || getServerPortFromConfig().toString(), 10);
  
  console.log(`🔗 Configuring Vite with API proxy to port: ${serverPort}`);
  
  return {
    plugins: [react()],
    root: '.',
    base: '/',
    build: {
      outDir: './dist',
      emptyOutDir: true,
      rollupOptions: {
        input: './index.html'
      }
    },
    server: {
      port: 5173,
      fs: {
        // Allow serving files from one level up to the project root
        allow: ['..'],
      },
      proxy: {
        '/api': {
          target: process.env.NODE_ENV === 'production' 
            ? '/.netlify/functions'
            : `http://localhost:${serverPort}`,
          changeOrigin: true,
          rewrite: process.env.NODE_ENV === 'production' 
            ? (path) => path.replace(/^\/api/, '/api')
            : undefined,
          timeout: 60000,
          proxyTimeout: 60000
        },
        '/output': {
          target: process.env.NODE_ENV === 'production' 
            ? '/.netlify/functions'
            : `http://localhost:${serverPort}`,
          changeOrigin: true,
          timeout: 60000,
          proxyTimeout: 60000,
          configure: (proxy) => {
            proxy.on('error', (err, req, res) => {
              console.warn('Proxy error:', err);
              if (!res.headersSent) {
                res.writeHead(500, {
                  'Content-Type': 'application/json',
                });
                res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
              }
            });
          }
        },
        '/reports': {
          target: process.env.NODE_ENV === 'production' 
            ? '/.netlify/functions'
            : `http://localhost:${serverPort}`,
          changeOrigin: true,
          timeout: 60000,
          proxyTimeout: 60000,
          configure: (proxy) => {
            proxy.on('error', (err, req, res) => {
              console.warn('Proxy error:', err);
              if (!res.headersSent) {
                res.writeHead(500, {
                  'Content-Type': 'application/json',
                });
                res.end(JSON.stringify({ error: 'Proxy error', message: err.message }));
              }
            });
          }
        },
        '/screenshots': {
          target: process.env.NODE_ENV === 'production' 
            ? '/.netlify/functions'
            : `http://localhost:${serverPort}`,
          changeOrigin: true,
          timeout: 30000
        },
        '/images': {
          target: process.env.NODE_ENV === 'production' 
            ? '/.netlify/functions'
            : `http://localhost:${serverPort}`,
          changeOrigin: true,
          timeout: 30000
        },
        '/assets': {
          target: process.env.NODE_ENV === 'production' 
            ? '/.netlify/functions'
            : `http://localhost:${serverPort}`,
          changeOrigin: true,
          timeout: 30000
        },
        '/socket.io': {
          target: process.env.NODE_ENV === 'production' 
            ? '/.netlify/functions'
            : `http://localhost:${serverPort}`,
          changeOrigin: true,
          ws: true
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './frontend/src')
      }
    },
    define: {
      // Make server port available in client code
      __SERVER_PORT__: serverPort
    }
  }
}) 
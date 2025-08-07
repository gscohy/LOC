import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0', // Permet l'accès depuis n'importe quelle IP
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:7000',
        changeOrigin: true,
        configure: (proxy, options) => {
          // Support pour l'accès réseau
          proxy.on('proxyReq', (proxyReq, req, res) => {
            // Permettre les requêtes cross-origin
            proxyReq.setHeader('Access-Control-Allow-Origin', '*');
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
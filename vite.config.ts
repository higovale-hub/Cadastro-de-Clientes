import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  // Permite acesso via túnel HTTPS (cloudflare trycloudflare.com) ao
  // `vite preview`, usado para instalar/testar o PWA no celular.
  preview: {
    allowedHosts: ['.trycloudflare.com'],
  },
  server: {
    allowedHosts: ['.trycloudflare.com'],
    // Proxy para o DynamoDB Local (Docker). O DynamoDB Local não suporta
    // CORS, então o app chama "/dynamo" (mesma origem) e o Vite repassa a
    // requisição para o container, eliminando o bloqueio do navegador.
    proxy: {
      '/dynamo': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        rewrite: (caminho) => caminho.replace(/^\/dynamo/, ''),
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Controle de Clientes',
        short_name: 'Clientes',
        description: 'Cadastro e controle de clientes e dívidas (offline-first)',
        theme_color: '#1e6feb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        lang: 'pt-BR',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
})

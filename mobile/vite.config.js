import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  plugins: [
    react(),
    basicSsl(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
        type: 'module'
      },
      includeAssets: ['icon-192.png', 'icon-512.png', 'screenshot_mobile.png', 'screenshot_desktop.png'],
      manifest: {
        id: '/',
        name: 'Orbiport - Reservas Deportivas',
        short_name: 'Orbiport',
        description: 'Reserva tus espacios deportivos favoritos',
        theme_color: '#4f46e5',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'es',
        categories: ['sports', 'lifestyle', 'productivity'],
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ],
        screenshots: [
          {
            src: '/screenshot_mobile.png',
            sizes: '336x749',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Pantalla principal de Orbiport en móvil'
          },
          {
            src: '/screenshot_desktop.png',
            sizes: '957x947',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Pantalla principal de Orbiport en escritorio'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cloudinary-images',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          }
        ]
      }
    })
  ],
})
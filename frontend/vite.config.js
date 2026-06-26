import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'script',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        id: "/",
        name: 'Real-Time Chat App',
        short_name: 'ChatApp',
        description: 'A modern real-time chat and video calling application',
        theme_color: '#1a1a1a',
        background_color: '#1a1a1a',
        display: 'standalone',
        display_override: ['window-controls-overlay'],
        orientation: 'portrait',
        dir: 'ltr',
        categories: ['communication', 'social'],
        screenshots: [
          {
            src: '/screenshot.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow'
          },
          {
            src: '/screenshot.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'wide'
          }
        ],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        shortcuts: [
          {
            name: "Open Chat",
            short_name: "Chat",
            description: "Go directly to your messages",
            url: "/",
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192" }]
          }
        ]
      }
    })
  ],
})

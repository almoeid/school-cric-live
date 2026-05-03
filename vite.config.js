import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],

      // 🚨 CACHE STRATEGY: prevents the "needs 3-5 refreshes" issue.
      // - cleanupOutdatedCaches: deletes precache versions left behind by old SWs
      // - skipWaiting + clientsClaim: new SW activates instantly instead of sitting in "waiting"
      // - NetworkFirst on navigation: index.html is always fetched fresh, so the bundle
      //   filenames it references are always the latest. JS/CSS/images stay precached
      //   for offline + speed (they're hashed, so safe to cache aggressively).
      workbox: {
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-pages',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 1 day fallback for offline
              }
            }
          }
        ]
      },

      manifest: {
        name: 'ZBSMCric',
        short_name: 'ZBSMCric',
        description: 'Live Cricket Scoring & Tournaments',
        theme_color: '#111827',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
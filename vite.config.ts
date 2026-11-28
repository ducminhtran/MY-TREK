import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// KT-02: site chạy dưới /<repo>/ trên GitHub Pages; workflow truyền VITE_BASE_PATH
const base = process.env.VITE_BASE_PATH || '/'

// KT-01: GitHub Pages không biết route SPA → copy index.html thành 404.html
function spaFallback404(): Plugin {
  let outDir = 'dist'
  return {
    name: 'spa-fallback-404',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html'))
    },
  }
}

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-64.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'My Trek',
        short_name: 'My Trek',
        description: 'Quản lý lịch trình, chi tiêu và chia tiền cho chuyến du lịch',
        lang: 'vi',
        display: 'standalone',
        theme_color: '#0f766e',
        background_color: '#ffffff',
        start_url: base,
        scope: base,
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        // Cache sẵn ảnh minh họa để xem được khi offline; og-image chỉ dùng khi chia sẻ link
        globPatterns: ['**/*.{js,css,html,png,svg,webp}'],
        globIgnores: ['og-image.jpg'],
        runtimeCaching: [
          {
            // PWA-02: dữ liệu Supabase – ưu tiên mạng, offline thì dùng bản đã cache
            urlPattern: ({ url }) => url.pathname.startsWith('/rest/v1/'),
            handler: 'NetworkFirst',
            method: 'GET',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 300, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // PWA-02: tile bản đồ OSM
            urlPattern: ({ url }) => url.hostname.endsWith('tile.openstreetmap.org'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: { maxEntries: 400, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
    spaFallback404(),
  ],
})

/* global process */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import seoPlugin from './seo/vitePlugin.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      react(),
      // Per-route static HTML, sitemap.xml and robots.txt. SEO_API_URL lets the
      // build read products from a reachable API (defaults to VITE_API_URL).
      seoPlugin({ apiUrl: env.SEO_API_URL || env.VITE_API_URL }),
    ],
  }
})

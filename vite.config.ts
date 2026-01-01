import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Base path for GitHub Pages deployment
  // Uses repository name as base path when deployed to gh-pages
  base: process.env.GITHUB_ACTIONS ? '/animated-lrc/' : '/',
  server: {
    host: true,
    port: 12000,
    allowedHosts: true,
    cors: true,
  },
})

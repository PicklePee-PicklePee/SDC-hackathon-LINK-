import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss({ optimize: false }),
  ],
  // Keep the design sandbox in artifacts/ out of the main app's dependency scan and file watcher.
  optimizeDeps: { entries: ['index.html'] },
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    watch: { ignored: ['**/artifacts/**'] },
  },
})

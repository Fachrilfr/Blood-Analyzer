import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/predict': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/predict-batch': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/download-report': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/static/output': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  }
})

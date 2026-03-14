import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Dev proxy: forwards /api/* to the backend running locally.
  // In Docker/EC2, nginx handles this proxy — this is only used by `npm run dev`.
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), 
    },
  },
  // add this server: {} to allows ngrok tunnel
  server: {
    allowedHosts: [
      'illtempered-unguiltily-gerard.ngrok-free.dev',
    ],
  },
})

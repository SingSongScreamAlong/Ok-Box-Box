import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'https://octopus-app-qsi3i.ondigitalocean.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});

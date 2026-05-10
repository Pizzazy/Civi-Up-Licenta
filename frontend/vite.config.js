import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router-dom')) return 'router';
            if (id.includes('recharts')) return 'charts';
            if (id.includes('lucide-react')) return 'icons';
            if (id.includes('react')) return 'react-vendor';
          }

          if (id.includes('/src/pages/EmailCRM')) return 'email-crm';
          if (id.includes('/src/pages/EmailBuilderPage')) return 'email-builder';
          if (id.includes('/src/pages/ProjectDetailPage') || id.includes('/src/pages/ProiectePage')) return 'projects';
          if (id.includes('/src/pages/DashboardPage') || id.includes('/src/components/layout')) return 'dashboard';

          return undefined;
        },
      },
    },
  },
});

import * as path from 'node:path';

import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react-swc';
import { defineConfig, normalizePath } from 'vite';
import checker from 'vite-plugin-checker';
import { viteStaticCopy } from 'vite-plugin-static-copy';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), TanStackRouterVite({
    routeToken: 'layout',
  }), viteStaticCopy({
    targets: [
      {
        src: normalizePath(path.resolve('./src/assets/locales')),
        dest: normalizePath(path.resolve('./dist')),
      },
    ],
  }), checker({ typescript: true })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/public': path.resolve(__dirname, './public'),
    },
  },
  server: {
    host: true,
    strictPort: true,
  },
});

import * as path from 'node:path';

import { TanStackRouterVite } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react-swc';
import { defineConfig, normalizePath } from 'vite';
import checker from 'vite-plugin-checker';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    TanStackRouterVite({
      routeToken: 'layout',
    }), 
    viteStaticCopy({
      targets: [
        {
          src: normalizePath(path.resolve('./src/assets/locales')),
          dest: normalizePath(path.resolve('./dist')),
        },
      ],
    }), 
    checker({ typescript: true })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@/public': fileURLToPath(new URL('./public', import.meta.url))
    },
  },
  server: {
    host: true,
    strictPort: true,
  },
});

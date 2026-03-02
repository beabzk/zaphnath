import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync } from 'fs';

// Read version from root package.json
const packageJson = JSON.parse(
  readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8')
);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, '../../'),
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    'import.meta.env.VITE_SENTRY_RELEASE': JSON.stringify(`zaphnath@${packageJson.version}`),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: 'hidden',
    outDir: 'dist',
    assetsDir: '.',
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
});

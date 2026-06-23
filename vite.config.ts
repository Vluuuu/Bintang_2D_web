import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Serve assets relative to index.html for ease of deployment
  server: {
    port: 3000,
    open: true
  },
  build: {
    assetsDir: 'assets',
    sourcemap: true
  }
});

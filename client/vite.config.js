// Settings for Vite, the tool that serves the website in development and builds it for release.
import { defineConfig } from 'vite';

// The browser only ever talks to the website's own address. Vite forwards anything under /api to
// the Fastify server, so there are no cross-origin issues in development and the Gemini key stays
// on the server.
const api = { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: true } };

export default defineConfig({
  server: { host: '127.0.0.1', port: 5173, strictPort: true, proxy: api },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true, proxy: api },
  build: {
    rollupOptions: {
      // Libraries mark files "use client" for Next.js; Vite doesn't need it. Hide only that
      // harmless warning so real build problems stand out.
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
    },
  },
});

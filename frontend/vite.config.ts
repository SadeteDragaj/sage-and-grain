import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Fixed ports (5173 and 5180 are used by other local projects); strictPort fails loudly instead of drifting.
  server: { host: '127.0.0.1', port: 5190, strictPort: true },
  preview: { host: '127.0.0.1', port: 4190, strictPort: true },
  // react-helmet-async ships CommonJS for Node; bundle it into the SSR build.
  ssr: { noExternal: ['react-helmet-async'] },
});

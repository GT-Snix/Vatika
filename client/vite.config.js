import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The React plugin turns JSX into plain JavaScript and enables fast refresh while editing.
export default defineConfig({
  plugins: [react()],
  // Fixed port: the server's CORS setting (CLIENT_ORIGIN) expects exactly this origin.
  server: { port: 5173, strictPort: true },
});

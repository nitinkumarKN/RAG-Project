import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite is kept intentionally small here so later modules can add only what they need.
export default defineConfig({
  plugins: [react()],
});

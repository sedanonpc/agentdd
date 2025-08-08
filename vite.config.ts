import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  // Ensure ESM modules are properly handled
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      // Add any aliases you need here
    }
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',

      'react-toastify',
      'lucide-react'
    ]
  },
  // Improve build options
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['react-toastify', 'lucide-react'],
          'solana-vendor': ['@solana/web3.js', '@solana/wallet-adapter-base']
        }
      }
    }
  }
});

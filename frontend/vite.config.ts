import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@game': path.resolve(__dirname, './src/game'),
      '@components': path.resolve(__dirname, './src/components'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@models': path.resolve(__dirname, './assets'),
    },
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          babylon: [
            '@babylonjs/core',
            '@babylonjs/loaders',
            '@babylonjs/materials',
            '@babylonjs/post-processes',
          ],
          vendor: ['react', 'react-dom'],
          ui: ['@mantine/core', '@mantine/hooks'],
        },
      },
    },
    chunkSizeWarningLimit: 2000,
  },
  optimizeDeps: {
    include: [
      '@babylonjs/core',
      '@babylonjs/loaders',
      '@babylonjs/materials',
      '@babylonjs/post-processes',
    ],
  },
  assetsInclude: ['**/*.glb', '**/*.gltf', '**/*.babylon', '**/*.hdr', '**/*.env', '**/*.dds', '**/*.fbx', '**/*.png'],
  server: {
    port: 3000,
    open: true,
    fs: {
      // Allow serving files from assets folder
      allow: ['..'],
    },
  },
  publicDir: 'public',
})

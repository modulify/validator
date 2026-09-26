import { defineConfig } from 'vite'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [],

  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
      '~types': resolve(import.meta.dirname, './types/'),
    },
  },
})
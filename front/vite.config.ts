/// <reference types="vitest/config" />
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// La API no habilita CORS: en desarrollo el navegador le habla a /api y Vite reenvía
// a FastAPI. Así el front funciona sin tocar el repositorio de la API.
const apiTarget = process.env.API_URL ?? 'http://127.0.0.1:8000'
const proxy = {
  '/api': { target: apiTarget, changeOrigin: true, rewrite: (url: string) => url.replace(/^\/api/, '') },
}

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: { port: 5173, proxy },
  preview: { port: 4173, proxy },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'jsdom',
          globals: true,
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['src/test/setup.ts'],
          css: { modules: { classNameStrategy: 'non-scoped' } },
          testTimeout: 15000,
        },
      },
      {
        extends: true,
        test: { name: 'contract', environment: 'node', globals: true, include: ['tests/contract/**/*.test.ts'] },
      },
    ],
  },
})

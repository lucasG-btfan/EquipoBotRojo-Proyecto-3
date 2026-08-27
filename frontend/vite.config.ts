import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Puerto fijo: debe coincidir con FRONTEND_ORIGIN del CORS del backend.
    // strictPort evita que Vite arranque silenciosamente en otro puerto (ej. 5174).
    port: 5173,
    strictPort: true,
  },
})

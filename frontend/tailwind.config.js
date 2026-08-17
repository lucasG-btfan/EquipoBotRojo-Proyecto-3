/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta semántica del panel SIEM (SDD). Ningún componente debe
        // escribir un color literal (bg-[#0f172a]): siempre usar estos tokens.
        fondo: '#0f172a',
        superficie: '#1e293b',
        borde: '#334155',
        primario: '#3b82f6',
        peligro: '#ef4444',
        advertencia: '#f59e0b',
        exito: '#22c55e',
      },
      fontFamily: {
        // Sin CDN ni paquete npm de fuentes: Inter/JetBrains Mono con
        // fallbacks del sistema (el panel puede correr sin salida a internet).
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}

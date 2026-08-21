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
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Anillo de luz que rota en el borde de las cards de capacidades
        // (LandingPage): solo transform, el color lo aporta la clase de
        // gradiente que lo usa.
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        // Barrido de luz horizontal usado por la card de "el problema" en
        // LandingPage, para diferenciarla del anillo de las capacidades.
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(400%)' },
        },
      },
      animation: {
        // Usada por el hero de LandingPage; cada elemento aplica su propio
        // [animation-delay:...] para el efecto escalonado.
        'fade-in-up': 'fade-in-up 0.7s ease-out forwards',
        'spin-slow': 'spin-slow 6s linear infinite',
        shimmer: 'shimmer 2.8s linear infinite',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Cormorant Garamond', 'Times New Roman', 'serif'],
      },
      colors: {
        surface: {
          DEFAULT: '#f8fafc',
          muted: '#f1f5f9',
          card: 'rgba(255, 255, 255, 0.8)',
        },
        ink: {
          DEFAULT: '#1e293b',
          muted: '#475569',
          subtle: '#64748b',
        },
        accent: {
          DEFAULT: '#10b981',
          soft: '#d1fae5',
          strong: '#059669',
        },
      },
      boxShadow: {
        glass: '0 20px 40px -12px rgb(15 23 42 / 0.12)',
        lift: '0 12px 28px -8px rgb(15 23 42 / 0.18)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
}

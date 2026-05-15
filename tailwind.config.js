/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#f3ede0',
        ink: '#0a0a0a',
        dust: '#8a7e6b',
        cancha: {
          400: '#e8632b',
          500: '#dd4f1a',
          600: '#c2410c',
          700: '#9a3412',
        },
      },
      fontFamily: {
        serif: ['"Instrument Serif"', 'Georgia', 'ui-serif', 'serif'],
        sans: ['"Space Grotesk"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}

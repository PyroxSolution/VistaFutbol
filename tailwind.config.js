/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cancha: {
          50: '#fff7ed',
          100: '#ffedd5',
          400: '#fb923c',
          500: '#ff6b1a',
          600: '#ea580c',
          700: '#c2410c',
          900: '#7c2d12',
        }
      },
      animation: {
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}

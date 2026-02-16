/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brown: {
          50: '#fdf8f6',
          100: '#f2e8e5',
          200: '#eaddd7',
          300: '#e0cec7',
          400: '#d2bab0',
          500: '#a1887f',
          600: '#8d6e63',
          700: '#795548', // Tailwind Material Brown roughly
          800: '#5d4037',
          900: '#3e2723',
        },
        gold: {
          400: '#FFD700',
          500: '#FFC107',
          600: '#FFB300',
        }
      }
    },
  },
  plugins: [],
}

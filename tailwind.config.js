/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        petroleum: {
          50: '#f1f7f9',
          100: '#dcebf1',
          200: '#bdd9e4',
          300: '#90bed1',
          400: '#5c99b6',
          500: '#3e7d9b',
          600: '#356682',
          700: '#30546c',
          800: '#2d475b',
          900: '#293d4e',
          950: '#172633',
        },
      },
    },
  },
  plugins: [],
}

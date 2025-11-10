/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx,css}'],
  theme: {
    extend: {
      colors: {
        background: '#f4f7fb',
        surface: '#ffffff',
        primary: {
          DEFAULT: '#6C63FF',
          light: '#857dff',
          dark: '#4c44c4',
        },
        accent: {
          blue: '#63b3ff',
          green: '#52d28d',
          pink: '#ff9fb3',
          orange: '#ffb347',
        },
      },
      boxShadow: {
        tile: '0 10px 25px rgba(108, 99, 255, 0.12)',
      },
    },
  },
  plugins: [],
}


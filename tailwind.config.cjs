/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx,css}'],
  darkMode: 'class', // 启用基于类的黑夜模式
  theme: {
    screens: {
      'xs': '475px',
      'sm': '640px',
      'md': '768px',
      'ipad': '820px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
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
        // 黑夜模式颜色
        dark: {
          background: '#0f172a',
          surface: '#1e293b',
          surfaceSecondary: '#334155',
          text: '#f8fafc',
          textSecondary: '#cbd5e1',
          textMuted: '#94a3b8',
          border: '#475569',
          borderLight: '#64748b',
          primary: {
            DEFAULT: '#818cf8',
            light: '#a5b4fc',
            dark: '#6366f1',
            bg: '#1e1b4b',
          },
          accent: {
            blue: '#60a5fa',
            green: '#4ade80',
            pink: '#f472b6',
            orange: '#fb923c',
            amber: '#fbbf24',
            emerald: '#34d399',
            sky: '#38bdf8',
            slate: '#64748b',
          },
        },
      },
      boxShadow: {
        tile: '0 10px 25px rgba(108, 99, 255, 0.12)',
        'dark-tile': '0 10px 25px rgba(0, 0, 0, 0.3)',
      },
      // 黑夜模式特定样式
      backgroundImage: {
        'dark-gradient': 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      },
    },
  },
  plugins: [],
}


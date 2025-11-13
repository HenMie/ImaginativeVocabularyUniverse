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
      '3xl': '1920px',
      '4xl': '2560px',
    },
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        md: '2rem',
        lg: '2.5rem',
        xl: '3rem',
        '2xl': '4rem',
        '3xl': '5rem',
        '4xl': '6rem',
      },
    },
    extend: {
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
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
        'soft': '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'medium': '0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06)',
        'large': '0 8px 32px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)',
        'glow': '0 0 20px rgba(108, 99, 255, 0.3)',
        'glow-sm': '0 0 10px rgba(108, 99, 255, 0.2)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
      },
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
      // 黑夜模式特定样式
      backgroundImage: {
        'dark-gradient': 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      },
    },
  },
  plugins: [],
}


import { useThemeStore } from '../store/themeStore'

export const ThemeToggle = () => {
  const { theme, setTheme, getEffectiveTheme } = useThemeStore()
  const effectiveTheme = getEffectiveTheme()

  const themes = [
    { value: 'light' as const, label: '浅色', icon: '☀️' },
    { value: 'dark' as const, label: '深色', icon: '🌙' },
    { value: 'system' as const, label: '跟随系统', icon: '🖥️' },
  ]

  return (
    <div className="flex items-center gap-1 rounded-full bg-slate-100/80 dark:bg-dark-surfaceSecondary/80 p-1 backdrop-blur-sm shadow-soft">
      {themes.map((themeOption) => {
        const isActive = theme === themeOption.value
        const isSystemActive = themeOption.value === 'system' && effectiveTheme === 'dark'

        return (
          <button
            key={themeOption.value}
            type="button"
            onClick={() => setTheme(themeOption.value)}
            className={`
              flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-smooth
              sm:px-4 sm:py-2 sm:text-sm lg:px-5 lg:py-2.5 lg:text-base
              ${isActive
                ? isSystemActive
                  ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-800 shadow-medium hover-scale-sm'
                  : 'bg-white text-slate-800 dark:bg-dark-primary dark:text-white shadow-medium hover-scale-sm'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50/50 dark:text-dark-textSecondary dark:hover:text-dark-text dark:hover:bg-dark-surface/50 hover-scale-sm'
              }
            `}
            title={themeOption.label}
          >
            <span className="text-sm sm:text-base lg:text-lg">{themeOption.icon}</span>
            <span className="hidden xs:inline">{themeOption.label}</span>
          </button>
        )
      })}
    </div>
  )
}
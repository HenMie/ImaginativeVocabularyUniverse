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
    <div className="flex items-center gap-1 rounded-full bg-slate-100 dark:bg-dark-surfaceSecondary p-1">
      {themes.map((themeOption) => {
        const isActive = theme === themeOption.value
        const isSystemActive = themeOption.value === 'system' && effectiveTheme === 'dark'

        return (
          <button
            key={themeOption.value}
            type="button"
            onClick={() => setTheme(themeOption.value)}
            className={`
              flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all
              sm:px-4 sm:py-2 sm:text-sm
              ${isActive
                ? isSystemActive
                  ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-800 shadow-sm'
                  : 'bg-white text-slate-800 dark:bg-dark-primary dark:text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800 dark:text-dark-textSecondary dark:hover:text-dark-text'
              }
            `}
            title={themeOption.label}
          >
            <span className="text-sm sm:text-base">{themeOption.icon}</span>
            <span className="hidden xs:inline">{themeOption.label}</span>
          </button>
        )
      })}
    </div>
  )
}
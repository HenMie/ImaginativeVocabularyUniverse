import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { STORAGE_KEY } from '../constants/storage'

type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: ThemeMode
  isDarkMode: boolean
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  getEffectiveTheme: () => 'light' | 'dark'
}

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const storage = createJSONStorage<Omit<ThemeState, 'setTheme' | 'toggleTheme' | 'getEffectiveTheme' | 'isDarkMode'> & { theme: ThemeMode }>(() => {
  if (typeof window === 'undefined') {
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      key: () => null,
      length: 0,
      clear: () => {},
    } as unknown as Storage
  }
  return window.localStorage
})

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      isDarkMode: getSystemTheme() === 'dark',

      setTheme: (theme: ThemeMode) => {
        const effectiveTheme = theme === 'system' ? getSystemTheme() : theme
        const isDarkMode = effectiveTheme === 'dark'

        set({ theme, isDarkMode })

        // 更新 HTML 类名
        if (typeof window !== 'undefined') {
          const root = document.documentElement
          if (isDarkMode) {
            root.classList.add('dark')
          } else {
            root.classList.remove('dark')
          }
        }
      },

      toggleTheme: () => {
        const currentTheme = get().theme
        const newTheme = currentTheme === 'light' ? 'dark' : 'light'
        get().setTheme(newTheme)
      },

      getEffectiveTheme: () => {
        const { theme } = get()
        return theme === 'system' ? getSystemTheme() : theme
      },
    }),
    {
      name: `${STORAGE_KEY}-theme`,
      storage,
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state) {
          const effectiveTheme = state.theme === 'system' ? getSystemTheme() : state.theme
          const isDarkMode = effectiveTheme === 'dark'

          // 更新状态和 DOM
          state.isDarkMode = isDarkMode
          if (typeof window !== 'undefined') {
            const root = document.documentElement
            if (isDarkMode) {
              root.classList.add('dark')
            } else {
              root.classList.remove('dark')
            }
          }
        }
      },
    }
  )
)

// 监听系统主题变化
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', () => {
    const theme = useThemeStore.getState()
    if (theme.theme === 'system') {
      theme.setTheme('system')
    }
  })
}
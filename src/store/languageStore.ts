import { create } from 'zustand'
import type { LanguageConfig } from '../types/language'

interface LanguageState {
  languages: LanguageConfig[]
  setLanguages: (languages: LanguageConfig[]) => void
  getLanguage: (code: string) => LanguageConfig | undefined
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  languages: [],
  setLanguages: (languages) => set({ languages }),
  getLanguage: (code: string) => get().languages.find((lang) => lang.code === code),
}))


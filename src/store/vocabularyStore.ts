/**
 * 生词本状态管理
 * 使用 Zustand 管理生词本的全局状态
 */

import { create } from 'zustand'
import type { VocabularyEntry, VocabularyByLanguage, AddVocabularyInput } from '../types/vocabulary'
import {
  fetchUserVocabulary,
  addVocabulary,
  removeVocabulary,
  updateReviewRecord,
  updateVocabulary,
} from '../services/vocabularyService'

interface VocabularyState {
  vocabulary: VocabularyEntry[]
  loading: boolean
  error: string | null

  // 计算属性
  getByLanguage: () => VocabularyByLanguage
  getLanguages: () => string[]
  getCount: (language?: string) => number

  // 操作方法
  loadVocabulary: (userId: string, language?: string) => Promise<void>
  addWord: (
    userId: string,
    word: string,
    translation: string,
    language: string,
    meta?: Partial<AddVocabularyInput>,
  ) => Promise<void>
  removeWord: (id: string) => Promise<void>
  markReviewed: (id: string) => Promise<void>
  updateNotes: (id: string, notes: string) => Promise<void>
  clear: () => void
}

export const useVocabularyStore = create<VocabularyState>((set, get) => ({
  vocabulary: [],
  loading: false,
  error: null,

  getByLanguage: () => {
    const { vocabulary } = get()
    return vocabulary.reduce<VocabularyByLanguage>((acc, entry) => {
      if (!acc[entry.language]) {
        acc[entry.language] = []
      }
      acc[entry.language].push(entry)
      return acc
    }, {})
  },

  getLanguages: () => {
    const byLanguage = get().getByLanguage()
    return Object.keys(byLanguage).sort()
  },

  getCount: (language) => {
    if (!language) {
      return get().vocabulary.length
    }
    const byLanguage = get().getByLanguage()
    return byLanguage[language]?.length || 0
  },

  loadVocabulary: async (userId, language) => {
    set({ loading: true, error: null })
    try {
      const data = await fetchUserVocabulary(userId, language)
      set({ vocabulary: data, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  addWord: async (userId, word, translation, language, meta) => {
    try {
      const newEntry = await addVocabulary(userId, {
        word,
        translation,
        language,
        ...meta,
      })
      set((state) => ({
        vocabulary: [newEntry, ...state.vocabulary],
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  removeWord: async (id) => {
    try {
      await removeVocabulary(id)
      set((state) => ({
        vocabulary: state.vocabulary.filter((v) => v.id !== id),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  markReviewed: async (id) => {
    try {
      const updated = await updateReviewRecord(id)
      set((state) => ({
        vocabulary: state.vocabulary.map((v) => (v.id === id ? updated : v)),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  updateNotes: async (id, notes) => {
    try {
      const updated = await updateVocabulary(id, { notes })
      set((state) => ({
        vocabulary: state.vocabulary.map((v) => (v.id === id ? updated : v)),
      }))
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  clear: () => set({ vocabulary: [], error: null }),
}))


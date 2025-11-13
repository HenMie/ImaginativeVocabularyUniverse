import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getCurrentVersion,
  getStoredVersion,
  saveCurrentVersion,
  checkVersionUpdate,
  clearAllCaches,
} from '../versionManager'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length
    },
  }
})()

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

describe('versionManager', () => {
  beforeEach(() => {
    localStorageMock.clear()
    sessionStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('getCurrentVersion', () => {
    it('应该返回当前版本号', () => {
      const version = getCurrentVersion()
      expect(version).toBeTruthy()
      expect(typeof version).toBe('string')
    })
  })

  describe('getStoredVersion', () => {
    it('首次运行时应该返回 null', () => {
      const version = getStoredVersion()
      expect(version).toBeNull()
    })

    it('应该返回存储的版本号', () => {
      localStorageMock.setItem('app-version', '1.0.0')
      const version = getStoredVersion()
      expect(version).toBe('1.0.0')
    })
  })

  describe('saveCurrentVersion', () => {
    it('应该保存当前版本号到 localStorage', () => {
      saveCurrentVersion()
      const storedVersion = localStorageMock.getItem('app-version')
      expect(storedVersion).toBe(getCurrentVersion())
    })
  })

  describe('checkVersionUpdate', () => {
    it('首次运行时应该返回 true（清除旧版本缓存）', () => {
      const hasUpdate = checkVersionUpdate()
      expect(hasUpdate).toBe(true)
      // 不应该自动保存版本（由 handleVersionUpdate 处理）
      expect(getStoredVersion()).toBeNull()
    })

    it('版本未变化时应该返回 false', () => {
      const currentVersion = getCurrentVersion()
      localStorageMock.setItem('app-version', currentVersion)
      const hasUpdate = checkVersionUpdate()
      expect(hasUpdate).toBe(false)
    })

    it('版本更新时应该返回 true', () => {
      localStorageMock.setItem('app-version', '1.0.0')
      const hasUpdate = checkVersionUpdate()
      expect(hasUpdate).toBe(true)
    })
  })

  describe('clearAllCaches', () => {
    it('应该清除 localStorage（除版本号外）', async () => {
      localStorageMock.setItem('app-version', '1.0.0')
      localStorageMock.setItem('user-data', 'test')
      localStorageMock.setItem('session-data', 'test')

      await clearAllCaches()

      expect(localStorageMock.getItem('app-version')).toBe('1.0.0')
      expect(localStorageMock.getItem('user-data')).toBeNull()
      expect(localStorageMock.getItem('session-data')).toBeNull()
    })

    it('应该清除 sessionStorage', async () => {
      sessionStorageMock.setItem('test-key', 'test-value')
      
      await clearAllCaches()

      expect(sessionStorageMock.length).toBe(0)
    })
  })
})


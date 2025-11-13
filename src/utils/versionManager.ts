/**
 * 版本管理工具
 * 用于检测应用版本更新并清除缓存
 */

const VERSION_STORAGE_KEY = 'app-version'

/**
 * 获取当前应用版本（从 package.json）
 */
export const getCurrentVersion = (): string => {
  // 在构建时，Vite 会将 package.json 的版本注入到环境变量
  // 如果没有环境变量，返回默认版本
  return import.meta.env.VITE_APP_VERSION || '1.1.1'
}

/**
 * 获取存储的版本号
 */
export const getStoredVersion = (): string | null => {
  try {
    return localStorage.getItem(VERSION_STORAGE_KEY)
  } catch (error) {
    console.error('读取存储版本失败:', error)
    return null
  }
}

/**
 * 保存当前版本号
 */
export const saveCurrentVersion = (): void => {
  try {
    const version = getCurrentVersion()
    localStorage.setItem(VERSION_STORAGE_KEY, version)
  } catch (error) {
    console.error('保存版本号失败:', error)
  }
}

/**
 * 清除所有应用缓存
 */
export const clearAllCaches = async (): Promise<void> => {
  console.info('🧹 开始清除所有缓存...')

  try {
    // 1. 清除 localStorage（保留版本号）
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key !== VERSION_STORAGE_KEY) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key)
      } catch (error) {
        console.warn(`清除 localStorage 键 "${key}" 失败:`, error)
      }
    })
    console.info(`✅ 已清除 ${keysToRemove.length} 个 localStorage 项`)

    // 2. 清除 sessionStorage
    try {
      sessionStorage.clear()
      console.info('✅ 已清除 sessionStorage')
    } catch (error) {
      console.warn('清除 sessionStorage 失败:', error)
    }

    // 3. 清除 Service Worker 缓存
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys()
        await Promise.all(
          cacheNames.map(async (cacheName) => {
            try {
              await caches.delete(cacheName)
              console.info(`✅ 已清除缓存: ${cacheName}`)
            } catch (error) {
              console.warn(`清除缓存 "${cacheName}" 失败:`, error)
            }
          })
        )
        console.info(`✅ 已清除 ${cacheNames.length} 个 Service Worker 缓存`)
      } catch (error) {
        console.warn('清除 Service Worker 缓存失败:', error)
      }
    }

    // 4. 注销 Service Worker（可选，让其重新注册）
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          await registration.unregister()
          console.info('✅ 已注销 Service Worker')
        }
      } catch (error) {
        console.warn('注销 Service Worker 失败:', error)
      }
    }

    console.info('🎉 缓存清除完成')
  } catch (error) {
    console.error('清除缓存时发生错误:', error)
  }
}

/**
 * 检查版本更新
 * @returns 如果版本已更新或首次运行返回 true，否则返回 false
 */
export const checkVersionUpdate = (): boolean => {
  const currentVersion = getCurrentVersion()
  const storedVersion = getStoredVersion()

  // 首次运行或版本不存在（可能是从旧版本升级）
  if (!storedVersion) {
    console.info('📦 首次运行版本管理功能，当前版本:', currentVersion)
    console.info('🧹 将清除旧版本缓存以避免兼容性问题')
    return true
  }

  // 版本已更新
  if (currentVersion !== storedVersion) {
    console.info(`🔄 检测到版本更新: ${storedVersion} → ${currentVersion}`)
    return true
  }

  // 版本未变化
  console.info('✅ 应用版本未变化:', currentVersion)
  return false
}

/**
 * 处理版本更新
 * 检查版本更新，如果有更新则清除缓存并刷新页面
 */
export const handleVersionUpdate = async (): Promise<void> => {
  const hasUpdate = checkVersionUpdate()

  if (hasUpdate) {
    console.info('🚀 开始处理版本更新...')
    
    // 清除所有缓存
    await clearAllCaches()
    
    // 保存新版本号
    saveCurrentVersion()
    
    // 提示用户并刷新页面
    console.info('🔄 即将刷新页面以应用新版本...')
    
    // 延迟一小段时间，确保日志输出
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }
}


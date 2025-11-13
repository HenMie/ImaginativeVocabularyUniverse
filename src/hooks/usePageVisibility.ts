import { useEffect, useState } from 'react'

/**
 * 监听页面可见性变化的 Hook
 * @param onVisibilityChange 可见性变化时的回调函数
 * @returns 当前页面是否可见
 */
export const usePageVisibility = (
  onVisibilityChange?: (isVisible: boolean) => void
): boolean => {
  const [isVisible, setIsVisible] = useState(!document.hidden)

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden
      setIsVisible(visible)
      onVisibilityChange?.(visible)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [onVisibilityChange])

  return isVisible
}

/**
 * 当页面重新可见时执行回调的 Hook
 * @param callback 页面重新可见时执行的回调
 * @param deps 依赖项数组
 */
export const useOnPageVisible = (
  callback: () => void,
  deps: React.DependencyList = []
): void => {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        callback()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}


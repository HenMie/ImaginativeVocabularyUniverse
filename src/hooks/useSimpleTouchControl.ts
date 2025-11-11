import { useEffect } from 'react'

/**
 * 轻量级触摸控制Hook，只阻止特定区域的触摸事件，避免画面倾斜
 * @param isDragging 是否正在拖拽
 */
export const useSimpleTouchControl = (isDragging: boolean) => {
  useEffect(() => {
    if (!isDragging) return

    // 添加触摸事件监听器，只阻止拖拽相关区域的默认行为
    const handleTouchMove = (e: TouchEvent) => {
      const target = e.target as Element

      // 只对单词卡和拖拽预览区域阻止默认行为
      if (target.closest('.word-tile') ||
          target.closest('.drag-preview') ||
          target.closest('[data-draggable]')) {
        e.preventDefault()
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as Element

      // 只对拖拽相关区域阻止默认行为
      if (target.closest('.word-tile') ||
          target.closest('.drag-preview') ||
          target.closest('[data-draggable]')) {
        e.preventDefault()
      }
    }

    // 添加事件监听器
    document.addEventListener('touchmove', handleTouchMove, {
      passive: false,
      capture: true
    })

    document.addEventListener('touchstart', handleTouchStart, {
      passive: false,
      capture: true
    })

    // 清理函数
    return () => {
      document.removeEventListener('touchmove', handleTouchMove, {
        capture: true
      } as any)

      document.removeEventListener('touchstart', handleTouchStart, {
        capture: true
      } as any)
    }
  }, [isDragging])
}
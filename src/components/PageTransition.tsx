import { type ReactNode, useRef, useEffect } from 'react'

interface PageTransitionProps {
  children: ReactNode
  type?: 'fade' | 'slide' | 'scale'
  direction?: 'up' | 'down' | 'left' | 'right'
  duration?: 'fast' | 'standard' | 'slow'
  className?: string
}

export const PageTransition = ({
  children,
  type = 'fade',
  direction = 'up',
  duration = 'standard',
  className = '',
}: PageTransitionProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    const content = contentRef.current
    if (!container || !content) return

    // 设置初始状态
    container.style.overflow = 'hidden'
    content.style.opacity = '0'

    // 根据动画类型设置初始变换
    const durationMap = {
      fast: '150ms',
      standard: '250ms',
      slow: '350ms'
    }

    const transformMap = {
      'slide-up': 'translateY(30px)',
      'slide-down': 'translateY(-30px)',
      'slide-left': 'translateX(30px)',
      'slide-right': 'translateX(-30px)',
      'scale': 'scale(0.95)',
      'fade': 'translateY(10px)'
    }

    const key = type === 'fade' ? 'fade' : `slide-${direction}`
    content.style.transform = transformMap[key as keyof typeof transformMap] || 'translateY(20px)'

    // 触发动画
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        content.style.transition = `opacity ${durationMap[duration]} var(--ease-out-cubic), transform ${durationMap[duration]} var(--ease-out-cubic)`
        content.style.opacity = '1'
        content.style.transform = 'translateY(0) scale(1)'
      })
    })

    return () => {
      // 清理样式
      if (content) {
        content.style.transition = ''
        content.style.opacity = ''
        content.style.transform = ''
      }
      if (container) {
        container.style.overflow = ''
      }
    }
  }, [type, direction, duration])

  return (
    <div ref={containerRef} className={className}>
      <div ref={contentRef} className="w-full h-full">
        {children}
      </div>
    </div>
  )
}

// 页面进入动画 Hook
export const usePageTransition = () => {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    // 初始状态
    element.style.opacity = '0'
    element.style.transform = 'translateY(20px)'

    // 触发进入动画
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        element.style.transition = 'opacity 0.25s var(--ease-out-cubic), transform 0.25s var(--ease-out-cubic)'
        element.style.opacity = '1'
        element.style.transform = 'translateY(0)'
      })
    })

    return () => {
      if (element) {
        element.style.transition = ''
        element.style.opacity = ''
        element.style.transform = ''
      }
    }
  }, [])

  return containerRef
}
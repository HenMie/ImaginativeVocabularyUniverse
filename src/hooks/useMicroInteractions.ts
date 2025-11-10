import { useEffect, useRef, useCallback } from 'react'

// 触觉反馈接口
interface HapticFeedback {
  light(): void
  medium(): void
  heavy(): void
  success(): void
  warning(): void
  error(): void
}

// 模拟触觉反馈
const createHapticFeedback = (): HapticFeedback => {
  if ('vibrate' in navigator) {
    return {
      light: () => navigator.vibrate(10),
      medium: () => navigator.vibrate(20),
      heavy: () => navigator.vibrate([30, 10, 30]),
      success: () => navigator.vibrate([15, 5, 15]),
      warning: () => navigator.vibrate([25, 10, 25]),
      error: () => navigator.vibrate([40, 15, 40]),
    }
  }

  // 降级处理：仅在控制台输出
  return {
    light: () => console.debug('Haptic: light'),
    medium: () => console.debug('Haptic: medium'),
    heavy: () => console.debug('Haptic: heavy'),
    success: () => console.debug('Haptic: success'),
    warning: () => console.debug('Haptic: warning'),
    error: () => console.debug('Haptic: error'),
  }
}

const haptic = createHapticFeedback()

// 微交互动效钩子
export const useMicroInteractions = () => {
  const audioContextRef = useRef<AudioContext | null>(null)

  // 初始化音频上下文（用于音效）
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch (error) {
        console.warn('Web Audio API not supported')
      }
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [])

  // 播放音效
  const playSound = useCallback((type: 'click' | 'success' | 'error' | 'complete') => {
    const audioContext = audioContextRef.current
    if (!audioContext) return

    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    const now = audioContext.currentTime

    switch (type) {
      case 'click':
        oscillator.frequency.setValueAtTime(800, now)
        oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.05)
        gainNode.gain.setValueAtTime(0.1, now)
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05)
        oscillator.start(now)
        oscillator.stop(now + 0.05)
        break
      case 'success':
        oscillator.frequency.setValueAtTime(400, now)
        oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.1)
        gainNode.gain.setValueAtTime(0.1, now)
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1)
        oscillator.start(now)
        oscillator.stop(now + 0.1)
        break
      case 'error':
        oscillator.frequency.setValueAtTime(300, now)
        oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.1)
        gainNode.gain.setValueAtTime(0.1, now)
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1)
        oscillator.start(now)
        oscillator.stop(now + 0.1)
        break
      case 'complete':
        oscillator.frequency.setValueAtTime(400, now)
        oscillator.frequency.setValueAtTime(500, now + 0.05)
        oscillator.frequency.setValueAtTime(600, now + 0.1)
        gainNode.gain.setValueAtTime(0.1, now)
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2)
        oscillator.start(now)
        oscillator.stop(now + 0.2)
        break
    }
  }, [])

  // 触发交互反馈
  const triggerFeedback = useCallback((
    type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error',
    sound?: 'click' | 'success' | 'error' | 'complete'
  ) => {
    // 触觉反馈
    haptic[type]()

    // 音效反馈
    if (sound) {
      playSound(sound)
    }
  }, [playSound])

  // 创建涟漪效果
  const createRipple = useCallback((event: React.MouseEvent | React.TouchEvent, element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const x = 'touches' in event ? event.touches[0].clientX - rect.left : event.clientX - rect.left
    const y = 'touches' in event ? event.touches[0].clientY - rect.top : event.clientY - rect.top

    const ripple = document.createElement('span')
    ripple.className = 'ripple-effect'

    const size = Math.max(rect.width, rect.height)
    const style = ripple.style

    style.width = style.height = size + 'px'
    style.left = (x - size / 2) + 'px'
    style.top = (y - size / 2) + 'px'

    // 添加涟漪样式
    const styleSheet = document.createElement('style')
    styleSheet.textContent = `
      .ripple-effect {
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.6);
        transform: scale(0);
        animation: ripple 0.6s ease-out;
        pointer-events: none;
        z-index: 1000;
      }
      @keyframes ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
    `

    if (!document.head.querySelector('style[data-ripple]')) {
      styleSheet.setAttribute('data-ripple', 'true')
      document.head.appendChild(styleSheet)
    }

    element.style.position = 'relative'
    element.style.overflow = 'hidden'
    element.appendChild(ripple)

    // 动画结束后移除元素
    setTimeout(() => {
      ripple.remove()
    }, 600)
  }, [])

  // 添加弹性动画类
  const addBounce = useCallback((element: HTMLElement, intensity: 'light' | 'medium' | 'strong' = 'medium') => {
    const intensityMap = {
      light: 'animate-bounce-light',
      medium: 'animate-bounce-medium',
      strong: 'animate-bounce-strong'
    }

    element.classList.add(intensityMap[intensity])

    setTimeout(() => {
      element.classList.remove(intensityMap[intensity])
    }, 600)
  }, [])

  // 添加浮动效果
  const addFloating = useCallback((element: HTMLElement, delay: number = 0) => {
    setTimeout(() => {
      element.style.transition = 'transform 0.3s var(--ease-out-cubic)'
      element.style.transform = 'translateY(-4px) scale(1.02)'

      setTimeout(() => {
        element.style.transform = 'translateY(0) scale(1)'
      }, 300)
    }, delay)
  }, [])

  return {
    triggerFeedback,
    createRipple,
    addBounce,
    addFloating,
    playSound
  }
}

// 全局微交互管理器
export class MicroInteractionManager {
  private static instance: MicroInteractionManager
  private elements: Set<HTMLElement> = new Set()

  static getInstance(): MicroInteractionManager {
    if (!MicroInteractionManager.instance) {
      MicroInteractionManager.instance = new MicroInteractionManager()
    }
    return MicroInteractionManager.instance
  }

  // 注册可交互元素
  registerElement(element: HTMLElement) {
    this.elements.add(element)
    this.addInteractionStyles(element)
  }

  // 注销元素
  unregisterElement(element: HTMLElement) {
    this.elements.delete(element)
  }

  // 添加交互样式
  private addInteractionStyles(element: HTMLElement) {
    // 确保元素有平滑过渡
    if (!element.style.transition) {
      element.style.transition = 'transform 0.15s var(--ease-out-cubic), box-shadow 0.15s var(--ease-out-cubic)'
    }

    // 添加hover效果
    const handleMouseEnter = () => {
      element.style.transform = 'translateY(-1px)'
      element.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
    }

    const handleMouseLeave = () => {
      element.style.transform = 'translateY(0)'
      element.style.boxShadow = ''
    }

    element.addEventListener('mouseenter', handleMouseEnter)
    element.addEventListener('mouseleave', handleMouseLeave)

    // 清理函数
    const cleanup = () => {
      element.removeEventListener('mouseenter', handleMouseEnter)
      element.removeEventListener('mouseleave', handleMouseLeave)
    }

    // 保存清理函数
    ;(element as any)._microInteractionCleanup = cleanup
  }

  // 清理所有元素
  cleanup() {
    this.elements.forEach(element => {
      const cleanup = (element as any)._microInteractionCleanup
      if (cleanup) cleanup()
    })
    this.elements.clear()
  }
}
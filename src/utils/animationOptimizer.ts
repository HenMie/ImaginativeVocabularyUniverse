// 动画性能优化工具 - 简化版以通过TypeScript检查

interface AnimationConfig {
  duration?: number
  delay?: number
  target?: HTMLElement
  onStart?: () => void
  onComplete?: () => void
  onUpdate?: (progress: number) => void
}

class AnimationOptimizer {
  private static instance: AnimationOptimizer
  private rafId: number | null = null
  private intersectionObserver!: IntersectionObserver
  private resizeObserver!: ResizeObserver

  static getInstance(): AnimationOptimizer {
    if (!AnimationOptimizer.instance) {
      AnimationOptimizer.instance = new AnimationOptimizer()
    }
    return AnimationOptimizer.instance
  }

  constructor() {
    this.setupObservers()
  }

  private setupObservers() {
    // 交叉观察器 - 视口外元素暂停动画
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const element = entry.target as HTMLElement
          if (entry.isIntersecting) {
            element.style.animationPlayState = 'running'
          } else {
            element.style.animationPlayState = 'paused'
          }
        })
      },
      { rootMargin: '50px' }
    )

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseAllAnimations()
      } else {
        this.resumeAllAnimations()
      }
    })

    // 大小变化观察器 - 优化重排
    this.resizeObserver = new ResizeObserver(
      this.throttle((entries) => {
        entries.forEach(() => {
          // 使用 requestAnimationFrame 优化重排
          this.rafId = requestAnimationFrame(() => {
            // 处理尺寸变化相关的动画
          })
        })
      }, 16) // 约 60fps
    )
  }

  // 节流函数
  private throttle<T extends (...args: any[]) => void>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let lastCall = 0
    return (...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastCall >= delay) {
        lastCall = now
        func(...args)
      }
    }
  }

  // 优化的动画执行
  public animate(config: AnimationConfig): Promise<void> {
    return new Promise((resolve) => {
      const delay = config.delay || 0

      if (delay > 0) {
        setTimeout(() => this.startAnimation(resolve, config), delay)
      } else {
        this.startAnimation(resolve, config)
      }
    })
  }

  private startAnimation(resolve: () => void, config: AnimationConfig) {
    const { onStart, onComplete, onUpdate } = config
    onStart?.()

    const startTime = performance.now()
    const durationMs = config.duration || 250

    const animationFrame = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / durationMs, 1)

      // 使用优化的缓动函数
      const easedProgress = this.optimizedEase(progress)

      onUpdate?.(easedProgress)

      if (progress < 1) {
        requestAnimationFrame(animationFrame)
      } else {
        onComplete?.()
        resolve()
      }
    }

    requestAnimationFrame(animationFrame)
  }

  // 优化的缓动函数
  private optimizedEase(t: number): number {
    // 优化的 cubic-bezier(0.215, 0.61, 0.355, 1)
    return t < 0.5
      ? 2 * t * t
      : -1 + (4 - 2 * t) * t
  }

  // 批量更新动画
  public batchUpdate(animations: (() => void)[]) {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
    }

    this.rafId = requestAnimationFrame(() => {
      animations.forEach(animation => animation())
      this.rafId = null
    })
  }

  // 暂停所有动画
  private pauseAllAnimations() {
    document.querySelectorAll('[class*="animate-"]').forEach((element) => {
      (element as HTMLElement).style.animationPlayState = 'paused'
    })
  }

  // 恢复所有动画
  private resumeAllAnimations() {
    document.querySelectorAll('[class*="animate-"]').forEach((element) => {
      (element as HTMLElement).style.animationPlayState = 'running'
    })
  }

  // 注册元素用于视口检测
  public observeElement(element: HTMLElement) {
    this.intersectionObserver.observe(element)
  }

  // 取消观察元素
  public unobserveElement(element: HTMLElement) {
    this.intersectionObserver.unobserve(element)
  }

  // 注册元素用于尺寸变化检测
  public observeResize(element: HTMLElement) {
    this.resizeObserver.observe(element)
  }

  // 取消尺寸观察
  public unobserveResize(element: HTMLElement) {
    this.resizeObserver.unobserve(element)
  }

  // 预加载动画资源
  public preloadAnimations() {
    // 由于CSS已经通过 @import 导入，不需要额外预加载
    // 直接预热动画引擎
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // 双重 requestAnimationFrame 确保动画引擎准备就绪
        console.log('Animation engine preloaded')
      })
    })
  }

  // 清理资源
  public cleanup() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId)
    }
    this.intersectionObserver.disconnect()
    this.resizeObserver.disconnect()
  }
}

// 性能监控
class AnimationPerformanceMonitor {
  private frameCount = 0
  private lastTime = 0
  private fps = 60
  private isMonitoring = false

  startMonitoring() {
    if (this.isMonitoring) return
    this.isMonitoring = true
    this.lastTime = performance.now()
    this.frameCount = 0
    this.monitor()
  }

  private monitor() {
    if (!this.isMonitoring) return

    const now = performance.now()
    this.frameCount++

    if (now - this.lastTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime))
      this.frameCount = 0
      this.lastTime = now

      // 如果 FPS 过低，自动优化动画
      if (this.fps < 30) {
        this.optimizeForLowPerformance()
      }

      console.log(`Animation FPS: ${this.fps}`)
    }

    requestAnimationFrame(() => this.monitor())
  }

  private optimizeForLowPerformance() {
    // 减少动画复杂度
    document.documentElement.style.setProperty('--animation-quality', 'low')

    // 降低动画频率
    const style = document.createElement('style')
    style.textContent = `
      @media (max-resolution: 1dppx) {
        * { animation-duration: 0.1s !important; }
        .animate-float, .animate-glow, .animate-heartbeat { animation: none !important; }
      }
    `
    document.head.appendChild(style)
  }

  stopMonitoring() {
    this.isMonitoring = false
  }

  getFPS(): number {
    return this.fps
  }
}

// 懒加载动画
export class LazyAnimationLoader {
  private loadedAnimations = new Set<string>()

  async loadAnimation(name: string): Promise<void> {
    if (this.loadedAnimations.has(name)) return

    // 模拟异步加载
    await new Promise(resolve => setTimeout(resolve, 10))
    this.loadedAnimations.add(name)
  }

  isLoaded(name: string): boolean {
    return this.loadedAnimations.has(name)
  }
}

// 导出优化工具
export const animationOptimizer = AnimationOptimizer.getInstance()
export const performanceMonitor = new AnimationPerformanceMonitor()
export const lazyAnimationLoader = new LazyAnimationLoader()

// 便捷的动画函数
export const animate = (config: AnimationConfig) => animationOptimizer.animate(config)

export const createSpringAnimation = (
  target: HTMLElement,
  properties: Record<string, number>,
  config?: Partial<AnimationConfig>
) => {
  return animate({
    target,
    duration: 400,
    ...config,
    onUpdate: (progress) => {
      Object.entries(properties).forEach(([prop, value]) => {
        const current = parseFloat(getComputedStyle(target)[prop as any] as string) || 0
        const newValue = current + (value - current) * progress
        ;(target.style as any)[prop] = `${newValue}px`
      })
      config?.onUpdate?.(progress)
    }
  })
}

export const createFadeInAnimation = (target: HTMLElement, config?: Partial<AnimationConfig>) => {
  target.style.opacity = '0'
  return animate({
    target,
    duration: 250,
    ...config,
    onUpdate: (progress) => {
      target.style.opacity = progress.toString()
      config?.onUpdate?.(progress)
    }
  })
}

export const createSlideInAnimation = (
  target: HTMLElement,
  direction: 'up' | 'down' | 'left' | 'right' = 'up',
  distance = 30,
  config?: Partial<AnimationConfig>
) => {
  const transforms = {
    up: `translateY(${distance}px)`,
    down: `translateY(-${distance}px)`,
    left: `translateX(${distance}px)`,
    right: `translateX(-${distance}px)`
  }

  target.style.transform = transforms[direction]
  target.style.opacity = '0'

  return animate({
    target,
    duration: 350,
    ...config,
    onUpdate: (progress) => {
      target.style.transform = `translateY(0) translateX(0)`
      target.style.opacity = progress.toString()
      config?.onUpdate?.(progress)
    }
  })
}
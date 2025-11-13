/**
 * 请求管理器 - 处理请求去重、重试和取消
 */

interface PendingRequest<T> {
  promise: Promise<T>
  timestamp: number
  cancelled: boolean
  abortController?: AbortController
}

class RequestManager {
  private pendingRequests = new Map<string, PendingRequest<any>>()
  private readonly REQUEST_TIMEOUT = 60000 // 60秒超时(增加到60秒)
  private readonly RETRY_DELAY = 1000 // 重试延迟1秒
  private readonly MAX_RETRIES = 3 // 最大重试次数
  private isOnline = true

  constructor() {
    // 监听网络状态变化
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline)
      window.addEventListener('offline', this.handleOffline)
      // 监听页面可见性变化
      document.addEventListener('visibilitychange', this.handleVisibilityChange)
    }
  }

  private handleOnline = () => {
    console.info('🌐 网络已恢复')
    this.isOnline = true
  }

  private handleOffline = () => {
    console.warn('📡 网络已断开')
    this.isOnline = false
    // 取消所有进行中的请求
    this.cancelAll()
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // 页面重新可见时,清理过期的请求
      this.cleanupStaleRequests()
    }
  }

  /**
   * 清理过期的请求(超过5分钟)
   */
  private cleanupStaleRequests(): void {
    const now = Date.now()
    const staleThreshold = 5 * 60 * 1000 // 5分钟

    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > staleThreshold) {
        console.warn(`清理过期请求: ${key}`)
        this.cancel(key)
      }
    }
  }

  /**
   * 执行请求，自动处理去重、重试和超时
   */
  async execute<T>(
    key: string,
    requestFn: () => Promise<T>,
    options?: {
      retries?: number
      timeout?: number
      forceRefresh?: boolean
    }
  ): Promise<T> {
    const { retries = this.MAX_RETRIES, timeout = this.REQUEST_TIMEOUT, forceRefresh = false } = options || {}

    // 检查网络状态
    if (!this.isOnline) {
      throw new Error('网络连接已断开,请检查您的网络设置')
    }

    // 如果强制刷新，取消之前的请求
    if (forceRefresh) {
      this.cancel(key)
    }

    // 检查是否有正在进行的相同请求
    const existing = this.pendingRequests.get(key)
    if (existing && !forceRefresh) {
      // 检查请求是否过期（超过5分钟）
      const age = Date.now() - existing.timestamp
      if (age < 5 * 60 * 1000 && !existing.cancelled) {
        return existing.promise
      } else {
        // 请求过期，取消它
        console.warn(`请求已过期,重新发起: ${key}`)
        this.cancel(key)
      }
    }

    // 创建 AbortController 用于取消请求
    const abortController = new AbortController()
    let cancelled = false

    const pendingRequest: PendingRequest<T> = {
      promise: Promise.resolve() as Promise<T>,
      timestamp: Date.now(),
      cancelled: false,
      abortController,
    }

    const requestPromise = this.executeWithRetry(
      () => {
        if (cancelled || abortController.signal.aborted) {
          throw new Error('请求已取消')
        }
        return requestFn()
      },
      retries,
      () => cancelled || abortController.signal.aborted
    )

    // 设置超时
    const timeoutPromise = new Promise<T>((_, reject) => {
      setTimeout(() => {
        cancelled = true
        pendingRequest.cancelled = true
        abortController.abort()
        reject(new Error(`请求超时,请刷新页面重试`))
      }, timeout)
    })

    const wrappedPromise = Promise.race([requestPromise, timeoutPromise])
      .catch((error) => {
        // 如果是取消错误，提供更友好的提示
        if (cancelled || abortController.signal.aborted) {
          if (error.message.includes('超时')) {
            throw error // 保留超时错误信息
          }
          throw new Error('请求已取消')
        }

        // 检查是否是会话过期错误
        if (error?.message?.includes('JWT') ||
            error?.message?.includes('session') ||
            error?.message?.includes('expired') ||
            error?.message?.includes('unauthorized') ||
            error?.code === 'PGRST301') {
          throw new Error('登录已过期,请刷新页面重新登录')
        }

        // 网络错误提供更友好的提示
        if (error instanceof TypeError || error.message.includes('fetch')) {
          throw new Error('网络请求失败,请检查网络连接后重试')
        }
        throw error
      })
      .finally(() => {
        // 请求完成后清理
        this.pendingRequests.delete(key)
      })

    pendingRequest.promise = wrappedPromise
    this.pendingRequests.set(key, pendingRequest)

    return wrappedPromise
  }

  /**
   * 带重试的请求执行
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    retries: number,
    isCancelled: () => boolean
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (isCancelled()) {
        throw new Error('请求已取消')
      }

      try {
        return await requestFn()
      } catch (error) {
        lastError = error as Error

        // 如果是最后一次尝试，直接抛出错误
        if (attempt === retries) {
          break
        }

        // 如果是取消错误，直接抛出
        if (error instanceof Error && error.message.includes('取消')) {
          throw error
        }

        // 如果是网络错误或超时，等待后重试
        const isNetworkError =
          error instanceof TypeError ||
          (error instanceof Error && (
            error.message.includes('fetch') ||
            error.message.includes('network') ||
            error.message.includes('timeout') ||
            error.message.includes('Failed to fetch') ||
            error.message.includes('NetworkError') ||
            error.message.includes('Network request failed')
          ))

        if (isNetworkError) {
          // 指数退避：1s, 2s, 4s
          const delay = this.RETRY_DELAY * Math.pow(2, attempt)
          await this.delay(delay)
          continue
        }

        // 其他错误不重试
        throw error
      }
    }

    throw lastError || new Error('请求失败')
  }

  /**
   * 取消指定请求
   */
  cancel(key: string): void {
    const pending = this.pendingRequests.get(key)
    if (pending) {
      pending.cancelled = true
      pending.abortController?.abort()
    }
    this.pendingRequests.delete(key)
  }

  /**
   * 取消所有请求
   */
  cancelAll(): void {
    for (const pending of this.pendingRequests.values()) {
      pending.cancelled = true
      pending.abortController?.abort()
    }
    this.pendingRequests.clear()
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * 检查是否有正在进行的请求
   */
  hasPending(key: string): boolean {
    return this.pendingRequests.has(key)
  }

  /**
   * 获取网络状态
   */
  getNetworkStatus(): boolean {
    return this.isOnline
  }

  /**
   * 清理资源
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline)
      window.removeEventListener('offline', this.handleOffline)
      document.removeEventListener('visibilitychange', this.handleVisibilityChange)
    }
    this.cancelAll()
  }
}

export const requestManager = new RequestManager()


/**
 * 请求管理器 - 处理请求去重、重试和取消
 */

interface PendingRequest<T> {
  promise: Promise<T>
  timestamp: number
  cancelled: boolean
}

class RequestManager {
  private pendingRequests = new Map<string, PendingRequest<any>>()
  private readonly REQUEST_TIMEOUT = 30000 // 30秒超时
  private readonly RETRY_DELAY = 1000 // 重试延迟1秒
  private readonly MAX_RETRIES = 3 // 最大重试次数

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
        this.cancel(key)
      }
    }

    // 创建新的请求
    let cancelled = false
    const pendingRequest: PendingRequest<T> = {
      promise: Promise.resolve() as Promise<T>,
      timestamp: Date.now(),
      cancelled: false,
    }

    const requestPromise = this.executeWithRetry(
      () => {
        if (cancelled) {
          throw new Error('请求已取消')
        }
        return requestFn()
      },
      retries,
      () => cancelled
    )

    // 设置超时
    const timeoutPromise = new Promise<T>((_, reject) => {
      setTimeout(() => {
        cancelled = true
        pendingRequest.cancelled = true
        reject(new Error(`请求超时: ${key}`))
      }, timeout)
    })

    const wrappedPromise = Promise.race([requestPromise, timeoutPromise])
      .catch((error) => {
        // 如果是取消错误，不抛出
        if (cancelled && error.message.includes('取消')) {
          throw new Error('请求已取消')
        }
        throw error
      })
      .finally(() => {
        // 请求完成后清理
        if (!cancelled) {
          this.pendingRequests.delete(key)
        }
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
    }
    this.pendingRequests.delete(key)
  }

  /**
   * 取消所有请求
   */
  cancelAll(): void {
    for (const pending of this.pendingRequests.values()) {
      pending.cancelled = true
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
}

export const requestManager = new RequestManager()


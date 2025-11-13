/**
 * 会话健康检查工具
 * 用于检测和恢复过期的会话
 */

import { supabase } from '../lib/supabase'

class SessionHealthChecker {
  private checkInterval: number | null = null
  private readonly CHECK_INTERVAL_MS = 5 * 60 * 1000 // 每5分钟检查一次
  private lastActivityTime = Date.now()
  private isChecking = false

  constructor() {
    if (typeof window !== 'undefined') {
      // 监听用户活动
      this.setupActivityListeners()
      // 启动定期检查
      this.startPeriodicCheck()
    }
  }

  /**
   * 设置用户活动监听器
   */
  private setupActivityListeners(): void {
    const updateActivity = () => {
      this.lastActivityTime = Date.now()
    }

    // 监听各种用户活动
    window.addEventListener('click', updateActivity, { passive: true })
    window.addEventListener('keydown', updateActivity, { passive: true })
    window.addEventListener('scroll', updateActivity, { passive: true })
    window.addEventListener('mousemove', updateActivity, { passive: true })
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkAndRefreshSession()
      }
    })
  }

  /**
   * 启动定期检查
   */
  private startPeriodicCheck(): void {
    if (this.checkInterval) {
      return
    }

    this.checkInterval = window.setInterval(() => {
      this.checkAndRefreshSession()
    }, this.CHECK_INTERVAL_MS)
  }

  /**
   * 停止定期检查
   */
  stopPeriodicCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  /**
   * 检查并刷新会话
   */
  async checkAndRefreshSession(): Promise<boolean> {
    if (this.isChecking) {
      return false
    }

    this.isChecking = true

    try {
      // 获取当前会话
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.warn('⚠️ Error getting session:', sessionError.message)
        return false
      }

      if (!session) {
        console.log('ℹ️ No active session')
        return false
      }

      // 检查会话是否即将过期（在30分钟内过期）
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
      const now = Date.now()
      const timeUntilExpiry = expiresAt - now
      const thirtyMinutes = 30 * 60 * 1000

      if (timeUntilExpiry < thirtyMinutes) {
        console.log('🔄 Session expiring soon, refreshing...')
        const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession()

        if (refreshError) {
          console.error('❌ Failed to refresh session:', refreshError.message)
          return false
        }

        if (newSession) {
          console.log('✅ Session refreshed successfully')
          return true
        }
      }

      return true
    } catch (error) {
      console.error('❌ Error checking session health:', error)
      return false
    } finally {
      this.isChecking = false
    }
  }

  /**
   * 获取最后活动时间
   */
  getLastActivityTime(): number {
    return this.lastActivityTime
  }

  /**
   * 获取距离最后活动的时间（毫秒）
   */
  getTimeSinceLastActivity(): number {
    return Date.now() - this.lastActivityTime
  }
}

// 导出单例
export const sessionHealthChecker = new SessionHealthChecker()


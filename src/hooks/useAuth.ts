import { useState, useEffect } from 'react'
import { type User, type Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { useProgressStore } from '../store/progressStore'
import { isEmailVerificationRequired } from '../services/systemSettingsService'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  isAdmin: boolean
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    isAdmin: false
  })

  useEffect(() => {
    const progressStore = useProgressStore.getState()
    // 获取初始会话
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        const isAdmin = await checkAdminStatus(session.user.id)
        void progressStore.initialize(session.user.id)
        setAuthState({
          user: session.user,
          session,
          loading: false,
          isAdmin
        })
      } else {
        progressStore.resetProgress()
        setAuthState({
          user: null,
          session: null,
          loading: false,
          isAdmin: false
        })
      }
    }

    getSession()

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event, session?.user?.id)

        if (session) {
          const isAdmin = await checkAdminStatus(session.user.id)
          void progressStore.initialize(session.user.id)
          setAuthState({
            user: session.user,
            session,
            loading: false,
            isAdmin
          })
        } else {
          progressStore.resetProgress()
          setAuthState({
            user: null,
            session: null,
            loading: false,
            isAdmin: false
          })
        }
      }
    )

    // 监听页面可见性变化，主动刷新会话
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('📄 Page became visible, refreshing session...')
        try {
          // 主动刷新会话
          const { data: { session }, error } = await supabase.auth.refreshSession()
          if (error) {
            console.warn('⚠️ Failed to refresh session:', error.message)
          } else if (session) {
            console.log('✅ Session refreshed successfully')
          }
        } catch (error) {
          console.error('❌ Error refreshing session:', error)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const checkAdminStatus = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      return !error && !!data
    } catch {
      return false
    }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    // 检查是否需要邮箱验证
    const emailVerificationNeeded = await isEmailVerificationRequired()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        },
        // 如果不需要邮箱验证，则自动确认邮箱
        emailRedirectTo: emailVerificationNeeded ? `${window.location.origin}/auth` : undefined,
      }
    })

    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      useProgressStore.getState().resetProgress()
    }
    return { error }
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    return { error }
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    return { error }
  }

  return {
    ...authState,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword
  }
}

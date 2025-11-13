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
      async (_event, session) => {
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

    return () => subscription.unsubscribe()
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

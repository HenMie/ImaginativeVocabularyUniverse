import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import { fetchUserProfile, type UserProfileSummary } from '../services/profileService'

export function UserMenu() {
  const { user, signOut, isAdmin } = useAuthContext()
  const [isOpen, setIsOpen] = useState(false)
  const [profile, setProfile] = useState<UserProfileSummary | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (user?.id) {
      fetchUserProfile(user.id)
        .then(setProfile)
        .catch(console.error)
    }
  }, [user?.id])

  const handleSignOut = async () => {
    await signOut()
    setIsOpen(false)
  }

  const handleNavigate = (path: string) => {
    navigate(path)
    setIsOpen(false)
  }

  if (!user) return null

  const displayName = profile?.username ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? '用户'

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-full hover:bg-slate-100/80 dark:hover:bg-dark-surfaceSecondary transition-smooth hover-scale-sm backdrop-blur-sm lg:px-4 lg:py-2.5"
      >
        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-primary to-primary-light rounded-full flex items-center justify-center shadow-soft">
          <span className="text-white text-sm lg:text-base font-bold">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="hidden sm:inline text-sm lg:text-base font-medium text-slate-700 dark:text-dark-text">
          {displayName}
        </span>
        <svg
          className={`w-4 h-4 lg:w-5 lg:h-5 text-slate-500 dark:text-dark-textMuted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="animate-scale-in absolute right-0 mt-3 w-56 lg:w-64 bg-white/95 dark:bg-dark-surface/95 rounded-3xl shadow-large border border-slate-200/50 dark:border-dark-border/50 py-2 z-50 backdrop-blur-xl">
          <div className="px-4 py-3 border-b border-slate-200/50 dark:border-dark-border/50">
            <p className="text-sm lg:text-base font-semibold text-slate-900 dark:text-dark-text">{displayName}</p>
            <p className="text-xs lg:text-sm text-slate-500 dark:text-dark-textMuted truncate">{user.email}</p>
            {isAdmin && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 dark:from-purple-900/30 dark:to-purple-800/30 dark:text-purple-300 mt-2 shadow-soft">
                ⭐ 管理员
              </span>
            )}
          </div>

          <div className="py-2">
            <button
              onClick={() => handleNavigate('/profile')}
              className="w-full text-left px-4 py-2.5 text-sm lg:text-base font-medium text-slate-700 dark:text-dark-text hover:bg-slate-100/80 dark:hover:bg-dark-surfaceSecondary rounded-2xl mx-2 transition-smooth hover-scale-sm"
            >
              👤 个人资料
            </button>
            <button
              onClick={() => handleNavigate('/settings')}
              className="w-full text-left px-4 py-2.5 text-sm lg:text-base font-medium text-slate-700 dark:text-dark-text hover:bg-slate-100/80 dark:hover:bg-dark-surfaceSecondary rounded-2xl mx-2 transition-smooth hover-scale-sm"
            >
              ⚙️ 设置
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleNavigate('/admin')}
                className="w-full text-left px-4 py-2.5 text-sm lg:text-base font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50/80 dark:hover:bg-purple-900/20 rounded-2xl mx-2 transition-smooth hover-scale-sm"
              >
                🛠️ 管理面板
              </button>
            )}
          </div>

          <div className="border-t border-slate-200/50 dark:border-dark-border/50 py-2 mt-1">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2.5 text-sm lg:text-base font-medium text-red-600 dark:text-red-400 hover:bg-red-50/80 dark:hover:bg-red-900/20 rounded-2xl mx-2 transition-smooth hover-scale-sm"
            >
              🚪 退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

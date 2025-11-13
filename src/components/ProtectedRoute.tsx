import { Navigate, useLocation } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import { useProgressStore } from '../store/progressStore'
import { LoadingSpinner } from './LoadingSpinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireAdmin?: boolean
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading, isAdmin } = useAuthContext()
  const progressInitialized = useProgressStore((state) => state.initialized)
  const progressLoading = useProgressStore((state) => state.loading)
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-dark-background">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) {
    // 保存当前路径，登录后可以返回
    return <Navigate to="/auth?mode=signin" state={{ from: location }} replace />
  }

  if (progressLoading || !progressInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-dark-background">
        <LoadingSpinner />
      </div>
    )
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

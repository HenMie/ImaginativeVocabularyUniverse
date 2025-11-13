import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { fetchLanguages } from './services/languageService'
import { Footer } from './components/Footer'
import { UserMenu } from './components/UserMenu'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider } from './contexts/AuthContext'
import { LevelPlay } from './routes/LevelPlay'
import { LevelSelect } from './routes/LevelSelect'
import { LanguageSettings } from './routes/LanguageSettings'
import { UserProfile } from './routes/UserProfile'
import { Auth } from './routes/Auth'
import { Admin } from './routes/Admin'
import { ForgotPassword } from './routes/ForgotPassword'
import { ResetPassword } from './routes/ResetPassword'
import { useLanguageStore } from './store/languageStore'

const AppHeader = () => {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-dark-border/50 transition-smooth">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-20">
        <div className="flex items-center justify-between h-16 lg:h-18">
          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="group flex items-center gap-2 text-xl lg:text-2xl font-bold transition-all duration-300 cursor-pointer"
            >
              <span className="text-2xl lg:text-3xl group-hover:scale-110 transition-transform duration-300">🧠</span>
              <span className="bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent group-hover:from-primary-light group-hover:to-primary transition-all duration-300">脑洞外语词场</span>
            </button>
          </div>
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export const App = () => {
  const setLanguages = useLanguageStore((state) => state.setLanguages)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLanguages()
      .then((languages) => {
        setLanguages(languages)
      })
      .catch((err: Error) => {
        console.error(err)
        setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [setLanguages])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background dark:bg-dark-background">
        <span className="animate-pulse text-lg text-primary dark:text-dark-primary">正在加载语言资源…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background dark:bg-dark-background p-6 text-center">
        <h1 className="text-2xl font-semibold text-red-500 dark:text-red-400">初始化失败</h1>
        <p className="max-w-md text-sm text-slate-600 dark:text-dark-textMuted">{error}</p>
      </div>
    )
  }

  return (
    <AuthProvider>
      <div className="flex min-h-screen flex-col bg-background dark:bg-dark-background">
        <Routes>
          {/* 公开路由 - 不需要登录 */}
          <Route path="/auth" element={<Auth />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* 主页 - 允许未登录访问，但功能受限 */}
          <Route
            path="/"
            element={
              <div className="flex-1 flex flex-col">
                <AppHeader />
                <main className="flex-1">
                  <LevelSelect />
                </main>
                <Footer />
              </div>
            }
          />

          {/* 受保护的路由 - 需要登录 */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <div className="flex-1 flex flex-col">
                  <AppHeader />
                  <main className="flex-1">
                    <UserProfile />
                  </main>
                  <Footer />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <div className="flex-1 flex flex-col">
                  <AppHeader />
                  <main className="flex-1">
                    <LanguageSettings />
                  </main>
                  <Footer />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/levels/:levelId"
            element={
              <ProtectedRoute>
                <div className="flex-1 flex flex-col">
                  <AppHeader />
                  <main className="flex-1">
                    <LevelPlay />
                  </main>
                  <Footer />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <div className="flex-1 flex flex-col">
                  <AppHeader />
                  <main className="flex-1">
                    <Admin />
                  </main>
                  <Footer />
                </div>
              </ProtectedRoute>
            }
          />

          {/* 404 重定向到主页 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  )
}


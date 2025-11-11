import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { fetchLanguages } from './services/languageService'
import { Footer } from './components/Footer'
import { LevelPlay } from './routes/LevelPlay'
import { LevelSelect } from './routes/LevelSelect'
import { LanguageSettings } from './routes/LanguageSettings'
import { useLanguageStore } from './store/languageStore'

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <span className="animate-pulse text-lg text-primary">正在加载语言资源…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <h1 className="text-2xl font-semibold text-red-500">初始化失败</h1>
        <p className="max-w-md text-sm text-slate-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Routes>
        <Route path="/" element={<LevelSelect />} />
        <Route path="/settings" element={<LanguageSettings />} />
        <Route path="/levels/:levelId" element={<LevelPlay />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Footer />
    </div>
  )
}


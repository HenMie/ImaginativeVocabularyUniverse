/**
 * 生词本页面
 * 展示用户收藏的所有生词,支持按语言筛选、搜索和导出
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../contexts/AuthContext'
import { useVocabularyStore } from '../store/vocabularyStore'
import { VocabularyCard } from '../components/VocabularyCard'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { exportToTxt, exportToPdf, exportToCsv } from '../utils/exportVocabulary'
import { getLanguageName } from '../utils/dictionaryLinks'

export const VocabularyBook = () => {
  const navigate = useNavigate()
  const { user } = useAuthContext()

  const {
    vocabulary,
    loading,
    error,
    getLanguages,
    getCount,
    loadVocabulary,
    removeWord,
    updateNotes,
  } = useVocabularyStore()

  const [selectedLanguage, setSelectedLanguage] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)

  useEffect(() => {
    if (user) {
      loadVocabulary(user.id).catch((err) => {
        console.error('加载生词本失败:', err)
      })
    }
  }, [user, loadVocabulary])

  const languages = getLanguages()

  // 筛选和搜索
  const filteredVocabulary = vocabulary.filter((entry) => {
    const matchLanguage = selectedLanguage === 'all' || entry.language === selectedLanguage
    const matchSearch =
      !searchQuery ||
      entry.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.translation.toLowerCase().includes(searchQuery.toLowerCase())
    return matchLanguage && matchSearch
  })

  const handleRemove = async (id: string) => {
    try {
      await removeWord(id)
    } catch (err) {
      alert('删除失败: ' + (err as Error).message)
    }
  }

  const handleUpdateNotes = async (id: string, notes: string) => {
    try {
      await updateNotes(id, notes)
    } catch (err) {
      alert('更新笔记失败: ' + (err as Error).message)
    }
  }

  const handleExport = (format: 'txt' | 'pdf' | 'csv') => {
    const exportLanguage = selectedLanguage === 'all' ? undefined : selectedLanguage
    switch (format) {
      case 'txt':
        exportToTxt(vocabulary, exportLanguage)
        break
      case 'pdf':
        exportToPdf(vocabulary, exportLanguage).catch((err) => {
          console.error('PDF导出失败:', err)
        })
        break
      case 'csv':
        exportToCsv(vocabulary, exportLanguage)
        break
    }
    setShowExportMenu(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background dark:bg-dark-background">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        {/* 页头 */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => navigate('/')}
                className="mb-4 text-sm text-primary hover:underline"
              >
                ← 返回首页
              </button>
              <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                📚 我的生词本
              </h1>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                共收藏 {vocabulary.length} 个单词
              </p>
            </div>
          </div>

          {/* 搜索栏 */}
          <div className="mt-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索单词或释义..."
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
            />
          </div>

          {/* 语言筛选和导出 */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {/* 语言筛选按钮 */}
            <button
              onClick={() => setSelectedLanguage('all')}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedLanguage === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              全部 ({vocabulary.length})
            </button>

            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  selectedLanguage === lang
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              >
                {getLanguageName(lang)} ({getCount(lang)})
              </button>
            ))}

            {/* 导出按钮 */}
            <div className="relative ml-auto">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
              >
                📥 导出
              </button>

              {showExportMenu && (
                <div className="absolute right-0 top-full z-10 mt-2 w-40 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800">
                  <button
                    onClick={() => handleExport('txt')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    导出为 TXT
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    导出为 PDF
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
                  >
                    导出为 CSV
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* 生词列表 */}
        {filteredVocabulary.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-600 dark:bg-slate-800">
            <div className="text-6xl">📖</div>
            <h3 className="mt-4 text-xl font-semibold text-slate-700 dark:text-slate-300">
              {searchQuery ? '没有找到匹配的单词' : '生词本是空的'}
            </h3>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              {searchQuery
                ? '尝试使用其他关键词搜索'
                : '在通关总结中点击"加入生词本"来添加生词'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredVocabulary.map((entry) => (
              <VocabularyCard
                key={entry.id}
                entry={entry}
                onRemove={() => handleRemove(entry.id)}
                onUpdateNotes={(notes) => handleUpdateNotes(entry.id, notes)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
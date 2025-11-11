import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguageStore } from '../store/languageStore'
import { useProgressStore } from '../store/progressStore'
import {
  MAX_DEFINITION_LANGUAGES,
  MIN_DEFINITION_LANGUAGES,
} from '../constants/languages'
import { ImportExportModal } from '../components/ImportExportModal'

export const LanguageSettings = () => {
  const navigate = useNavigate()
  const languages = useLanguageStore((state) => state.languages)
  const languagePreferences = useProgressStore((state) => state.progress.languagePreferences)
  const setGameLanguage = useProgressStore((state) => state.setGameLanguage)
  const setDefinitionLanguages = useProgressStore((state) => state.setDefinitionLanguages)
  const [showBackup, setShowBackup] = useState(false)

  const gameLanguage = languagePreferences.game
  const definitionLanguages = languagePreferences.definitions

  const definitionSet = useMemo(() => new Set(definitionLanguages), [definitionLanguages])
  const canAddDefinitions = definitionLanguages.length < MAX_DEFINITION_LANGUAGES
  const atMinDefinitions = definitionLanguages.length <= MIN_DEFINITION_LANGUAGES

  const toggleDefinitionLanguage = (code: string) => {
    if (definitionSet.has(code)) {
      if (atMinDefinitions) {
        return
      }
      setDefinitionLanguages(definitionLanguages.filter((item) => item !== code))
      return
    }
    if (!canAddDefinitions) {
      return
    }
    setDefinitionLanguages([...definitionLanguages, code])
  }

  return (
    <>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-sm font-medium text-primary transition hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              ← 返回关卡选择
            </button>
            <h1 className="mt-2 text-3xl font-semibold text-slate-800">设置</h1>
            <p className="text-sm text-slate-500">配置语言偏好并管理存档数据</p>
          </div>
        </div>

        <section className="rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-100">
          <header className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">游戏语言</h2>
              <p className="text-sm text-slate-500">
                用于词牌正面显示的语言（一次只能选择一种）
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              当前：{gameLanguage.toUpperCase()}
            </span>
          </header>
          <div className="grid gap-2 sm:grid-cols-2">
            {languages.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-400">暂无语言数据</div>
            ) : (
              languages.map((language) => {
                const isActive = language.code === gameLanguage
                return (
                  <button
                    key={`game-lang-${language.code}`}
                    type="button"
                    onClick={() => setGameLanguage(language.code)}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-primary/40 bg-primary/5 text-primary shadow-inner'
                        : 'border-slate-200 bg-white/70 text-slate-600 hover:border-primary/30'
                    }`}
                  >
                    <span>
                      <span className="font-semibold">{language.nativeName}</span>
                      <span className="ml-1 text-xs text-slate-400">{language.name}</span>
                    </span>
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      {isActive ? '当前' : language.code}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </section>

        <section className="rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-100">
          <header className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">释义语言</h2>
              <p className="text-sm text-slate-500">
                至少选择 {MIN_DEFINITION_LANGUAGES} 种，最多 {MAX_DEFINITION_LANGUAGES} 种，将按选择顺序在词牌详情中展示
              </p>
            </div>
            <span className="rounded-full bg-slate-800/10 px-3 py-1 text-xs font-semibold text-slate-600">
              已选 {definitionLanguages.length}/{MAX_DEFINITION_LANGUAGES}
            </span>
          </header>
          <div className="grid gap-2 sm:grid-cols-2">
            {languages.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-400">暂无语言数据</div>
            ) : (
              languages.map((language) => {
                const isActive = definitionSet.has(language.code)
                const disabled = (!isActive && !canAddDefinitions) || (isActive && atMinDefinitions)
                return (
                  <button
                    key={`definition-lang-${language.code}`}
                    type="button"
                    onClick={() => toggleDefinitionLanguage(language.code)}
                    disabled={disabled}
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-inner'
                        : 'border-slate-200 bg-white/70 text-slate-600 hover:border-emerald-300'
                    } ${disabled && !isActive ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <span>
                      <span className="font-semibold">{language.nativeName}</span>
                      <span className="ml-1 text-xs text-slate-400">{language.name}</span>
                    </span>
                    <span className="text-xs font-semibold uppercase text-slate-400">
                      {isActive ? '已选' : language.code}
                    </span>
                  </button>
                )
              })
            )}
          </div>
          {!canAddDefinitions && (
            <p className="mt-3 text-xs text-slate-500">
              已达到最多 {MAX_DEFINITION_LANGUAGES} 种释义语言。如需调整，请先取消其中一种再新增。
            </p>
          )}
          {atMinDefinitions && (
            <p className="mt-1 text-xs text-slate-500">至少保留 {MIN_DEFINITION_LANGUAGES} 种释义语言。</p>
          )}
        </section>

        <section className="rounded-3xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-100">
          <header className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">数据备份</h2>
              <p className="text-sm text-slate-500">
                导出当前进度或导入已有存档，用于设备迁移或数据恢复
              </p>
            </div>
          </header>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowBackup(true)}
              className="flex items-center gap-2 rounded-full bg-slate-800/10 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-800/20 focus:outline-none focus:ring-2 focus:ring-slate-400/40"
            >
              打开导入 / 导出
            </button>
            <p className="text-xs text-slate-500">
              导入会覆盖当前进度，请在导入前做好备份。
            </p>
          </div>
        </section>
      </main>
      <ImportExportModal open={showBackup} onClose={() => setShowBackup(false)} />
    </>
  )
}

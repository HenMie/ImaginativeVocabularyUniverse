import { useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { useLanguageStore } from '../store/languageStore'
import { useProgressStore } from '../store/progressStore'
import {
  MAX_DEFINITION_LANGUAGES,
  MIN_DEFINITION_LANGUAGES,
} from '../constants/languages'
import { ThemeToggle } from '../components/ThemeToggle'

// 拖拽项类型
const ItemType = {
  DEFINITION_LANGUAGE: 'definition-language',
}

// 普通语言项组件（不可拖拽）
const LanguageItem = ({
  language,
  isActive,
  disabled,
  onToggle
}: {
  language: any
  isActive: boolean
  disabled: boolean
  onToggle: () => void
}) => {
  const handleClick = () => {
    if (isActive) {
      // 已激活的语言点击时可以取消选择
      onToggle()
    } else if (!disabled) {
      // 未激活的语言点击时可以选择
      onToggle()
    }
  }

  return (
    <div
      onClick={handleClick}
      className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-left transition sm:px-4 sm:py-3 ${
        isActive
          ? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-inner dark:border-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-400'
          : 'border-slate-200 bg-white/70 text-slate-600 hover:border-emerald-300 dark:border-dark-border dark:bg-dark-surfaceSecondary dark:text-dark-textSecondary dark:hover:border-emerald-500'
      } ${disabled && !isActive ? 'cursor-not-allowed opacity-50' : ''}`}
      style={{ cursor: isActive ? 'pointer' : 'pointer' }}
    >
      <span className="flex items-center gap-2 text-sm sm:text-base">
        {isActive && (
          <span className="text-emerald-600">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </span>
        )}
        <span>
          <span className="font-semibold">{language.nativeName}</span>
          <span className="ml-1 text-xs text-slate-400 dark:text-dark-textMuted">{language.name}</span>
        </span>
      </span>
      <span className="text-xs font-semibold uppercase text-slate-400 dark:text-dark-textMuted">
        {language.code}
      </span>
    </div>
  )
}

// 拖拽语言项组件
const DraggableLanguageItem = ({
  language,
  index,
  isActive,
  disabled,
  onToggle,
  onMove
}: {
  language: any
  index: number
  isActive: boolean
  disabled: boolean
  onToggle: () => void
  onMove: (dragIndex: number, hoverIndex: number) => void
}) => {
  const ref = useRef<HTMLDivElement>(null)

  const [{ isDragging }, drag] = useDrag({
    type: ItemType.DEFINITION_LANGUAGE,
    item: { index, isActive },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: isActive,
  })

  const [, drop] = useDrop({
    accept: ItemType.DEFINITION_LANGUAGE,
    hover: (item: { index: number; isActive: boolean }, monitor) => {
      if (!ref.current || !item.isActive || !isActive || item.index === index) {
        return
      }

      const hoverBoundingRect = ref.current.getBoundingClientRect()
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2
      const clientOffset = monitor.getClientOffset()
      const hoverClientY = clientOffset ? clientOffset.y - hoverBoundingRect.top : 0

      // 向下拖动超过一半高度时才开始交换
      if (item.index < index && hoverClientY < hoverMiddleY) {
        return
      }
      // 向上拖动超过一半高度时才开始交换
      if (item.index > index && hoverClientY > hoverMiddleY) {
        return
      }

      // 交换位置
      onMove(item.index, index)
      item.index = index
    },
  })

  drag(drop(ref))

  const handleClick = () => {
    if (isActive) {
      // 已激活的语言点击时可以取消选择
      onToggle()
    } else if (!disabled) {
      // 未激活的语言点击时可以选择
      onToggle()
    }
  }

  return (
    <div
      ref={ref}
      onClick={handleClick}
      className={`flex items-center justify-between rounded-2xl border px-3 py-2 text-left transition sm:px-4 sm:py-3 ${
        isDragging ? 'opacity-50' : ''
      } ${
        isActive
          ? 'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-inner cursor-move dark:border-emerald-500 dark:bg-emerald-900/20 dark:text-emerald-400'
          : 'border-slate-200 bg-white/70 text-slate-600 hover:border-emerald-300 dark:border-dark-border dark:bg-dark-surfaceSecondary dark:text-dark-textSecondary dark:hover:border-emerald-500'
      } ${disabled && !isActive ? 'cursor-not-allowed opacity-50' : ''}`}
      style={{ cursor: isActive ? 'move' : 'pointer' }}
    >
      <span className="flex items-center gap-2 text-sm sm:text-base">
        {isActive && (
          <span className="text-emerald-600">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </span>
        )}
        <span>
          <span className="font-semibold">{language.nativeName}</span>
          <span className="ml-1 text-xs text-slate-400 dark:text-dark-textMuted">{language.name}</span>
        </span>
      </span>
      <span className="text-xs font-semibold uppercase text-slate-400 dark:text-dark-textMuted">
        {isActive ? `#${index + 1}` : language.code}
      </span>
    </div>
  )
}

export const LanguageSettings = () => {
  const navigate = useNavigate()
  const languages = useLanguageStore((state) => state.languages)
  const languagePreferences = useProgressStore((state) => state.progress.languagePreferences)
  const setGameLanguage = useProgressStore((state) => state.setGameLanguage)
  const setDefinitionLanguages = useProgressStore((state) => state.setDefinitionLanguages)

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

  const moveDefinitionLanguage = (dragIndex: number, hoverIndex: number) => {
    const newDefinitions = [...definitionLanguages]
    const draggedItem = newDefinitions[dragIndex]
    newDefinitions.splice(dragIndex, 1)
    newDefinitions.splice(hoverIndex, 0, draggedItem)
    setDefinitionLanguages(newDefinitions)
  }



  return (
    <DndProvider backend={HTML5Backend}>
      <main className="page-enter-animation mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4 bg-background dark:bg-dark-background sm:gap-6 sm:p-6 md:gap-7 md:p-8 lg:max-w-5xl lg:gap-8 lg:p-10 xl:max-w-6xl xl:gap-10 xl:p-12 2xl:max-w-7xl">
        <div className="fade-in-up flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-sm font-medium text-primary transition-smooth hover:text-primary/80 hover-scale-sm focus:outline-none focus:ring-2 focus:ring-primary/40 dark:text-dark-primary dark:hover:text-dark-primary/80 lg:text-base"
            >
              ← 返回关卡选择
            </button>
            <h1 className="mt-2 text-2xl font-bold text-slate-800 dark:text-dark-text sm:text-3xl lg:text-4xl xl:text-5xl">设置</h1>
            <p className="text-xs text-slate-500 dark:text-dark-textMuted sm:text-sm lg:text-base xl:text-lg">配置游戏偏好</p>
          </div>
        </div>

        <section className="card-enter rounded-4xl bg-white/80 p-3 shadow-medium ring-1 ring-slate-100 dark:bg-dark-surface dark:ring-dark-border sm:p-4 md:p-5 lg:p-6 xl:p-8 md:mb-4 backdrop-blur-sm transition-smooth">
          <header className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-dark-text sm:text-lg lg:text-xl">游戏语言</h2>
              <p className="text-xs text-slate-500 dark:text-dark-textMuted sm:text-sm lg:text-base">
                用于词牌正面显示的语言（一次只能选择一种）
              </p>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary dark:bg-dark-primary/20 dark:text-dark-primary sm:px-4 lg:text-sm">
              当前：{gameLanguage.toUpperCase()}
            </span>
          </header>
          <div className="grid gap-2 sm:grid-cols-2 md:gap-3 lg:grid-cols-3 lg:gap-4 xl:grid-cols-4 xl:gap-5">
            {languages.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-400 dark:bg-dark-surfaceSecondary dark:text-dark-textMuted">暂无语言数据</div>
            ) : (
              languages.map((language) => {
                const isActive = language.code === gameLanguage
                return (
                  <button
                    key={`game-lang-${language.code}`}
                    type="button"
                    onClick={() => setGameLanguage(language.code)}
                    className={`flex items-center justify-between rounded-3xl border px-3 py-2 text-left transition-smooth sm:px-4 sm:py-3 lg:px-5 lg:py-4 ${
                      isActive
                        ? 'border-primary/40 bg-primary/5 text-primary shadow-soft dark:border-dark-primary/50 dark:bg-dark-primary/10 dark:text-dark-primary hover-scale-sm'
                        : 'border-slate-200 bg-white/70 text-slate-600 hover:border-primary/30 hover-lift-sm dark:border-dark-border dark:bg-dark-surfaceSecondary dark:text-dark-textSecondary dark:hover:border-dark-primary/30'
                    }`}
                  >
                    <span className="text-sm sm:text-base">
                      <span className="font-semibold">{language.nativeName}</span>
                      <span className="ml-1 text-xs text-slate-400 dark:text-dark-textMuted">{language.name}</span>
                    </span>
                    <span className="text-xs font-semibold uppercase text-slate-400 dark:text-dark-textMuted">
                      {isActive ? '当前' : language.code}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </section>

        <section className="rounded-3xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-100 dark:bg-dark-surface dark:ring-dark-border sm:p-4 md:p-5 md:mb-4 ipad:p-6">
          <header className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-dark-text sm:text-lg">释义语言</h2>
              <p className="text-xs text-slate-500 dark:text-dark-textMuted sm:text-sm">
                至少选择 {MIN_DEFINITION_LANGUAGES} 种，最多 {MAX_DEFINITION_LANGUAGES} 种，将按选择顺序在词牌详情中展示
              </p>
            </div>
            <span className="rounded-full bg-slate-800/10 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-dark-surfaceSecondary dark:text-dark-textSecondary sm:px-3">
              已选 {definitionLanguages.length}/{MAX_DEFINITION_LANGUAGES}
            </span>
          </header>
          <div className="space-y-2">
            <div className="mb-2 text-xs text-slate-500 dark:text-dark-textMuted">
              💡 提示：已选择的语言可以拖动调整顺序
            </div>
            {languages.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-400 dark:bg-dark-surfaceSecondary dark:text-dark-textMuted">暂无语言数据</div>
            ) : (
              <>
                {/* 渲染已选择的语言 */}
                {definitionLanguages.map((languageCode, index) => {
                  const language = languages.find(l => l.code === languageCode)
                  if (!language) return null
                  const isActive = true
                  const disabled = atMinDefinitions

                  return (
                    <DraggableLanguageItem
                      key={`definition-lang-selected-${languageCode}`}
                      language={language}
                      index={index}
                      isActive={isActive}
                      disabled={disabled}
                      onToggle={() => toggleDefinitionLanguage(languageCode)}
                      onMove={moveDefinitionLanguage}
                    />
                  )
                })}
                {/* 渲染未选择的语言 */}
                {languages.filter(language => !definitionSet.has(language.code)).map((language) => {
                  const isActive = false
                  const disabled = !canAddDefinitions

                  return (
                    <LanguageItem
                      key={`definition-lang-unselected-${language.code}`}
                      language={language}
                      isActive={isActive}
                      disabled={disabled}
                      onToggle={() => toggleDefinitionLanguage(language.code)}
                    />
                  )
                })}
              </>
            )}
          </div>
          {!canAddDefinitions && (
            <p className="mt-3 text-xs text-slate-500 dark:text-dark-textMuted">
              已达到最多 {MAX_DEFINITION_LANGUAGES} 种释义语言。如需调整，请先取消其中一种再新增。
            </p>
          )}
          {atMinDefinitions && (
            <p className="mt-1 text-xs text-slate-500 dark:text-dark-textMuted">至少保留 {MIN_DEFINITION_LANGUAGES} 种释义语言。</p>
          )}
        </section>

        <section className="rounded-3xl bg-white/80 p-3 shadow-sm ring-1 ring-slate-100 dark:bg-dark-surface dark:ring-dark-border sm:p-4 md:p-5 md:mb-4 ipad:p-6">
          <header className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-dark-text sm:text-lg">界面主题</h2>
              <p className="text-xs text-slate-500 dark:text-dark-textMuted sm:text-sm">
                选择您偏好的界面主题，支持跟随系统设置
              </p>
            </div>
          </header>
          <div className="flex items-center justify-center sm:justify-start">
            <ThemeToggle />
          </div>
        </section>
          </main>
    </DndProvider>
  )
}

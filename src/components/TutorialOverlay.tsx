import type { TranslationMap } from '../types/language'
import { pickTranslation } from '../utils/translation'
import { useProgressStore } from '../store/progressStore'

interface TutorialOverlayProps {
  open: boolean
  steps: string[] | TranslationMap[]
  gameLanguage?: string
  onClose: () => void
}

export const TutorialOverlay = ({ open, steps, onClose }: TutorialOverlayProps) => {
  if (!open) return null

  // 获取用户的释义语言设置
  const { progress } = useProgressStore()
  const definitionLanguage = progress.languagePreferences.definitions[0]

  // 处理多语言步骤
  const processedSteps = steps.map((step) => {
    if (typeof step === 'string') {
      return step
    }
    // 使用用户的第一个释义语言，而不是游戏语言
    return pickTranslation(step, definitionLanguage)
  })

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 backdrop-blur">
      <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl dark:bg-dark-surface dark:shadow-dark-tile">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-dark-text">快速上手</h2>
        <ol className="mt-4 space-y-3 text-sm text-slate-600 dark:text-dark-textMuted">
          {processedSteps.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary dark:bg-dark-primary/20 dark:text-dark-primary">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-dark dark:bg-dark-primary dark:hover:bg-dark-primary-dark"
        >
          开始挑战
        </button>
      </div>
    </div>
  )
}


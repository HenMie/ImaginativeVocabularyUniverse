/**
 * 生词卡片组件
 * 展示单个生词条目,包括单词、释义、分类、词典链接等
 */

import { useState } from 'react'
import type { VocabularyEntry } from '../types/vocabulary'
import { getDictionaryUrl, getDictionaryName } from '../utils/dictionaryLinks'

interface VocabularyCardProps {
  entry: VocabularyEntry
  onRemove: () => void
  onUpdateNotes?: (notes: string) => void
}

export const VocabularyCard = ({ entry, onRemove, onUpdateNotes }: VocabularyCardProps) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notes, setNotes] = useState(entry.notes || '')
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  const dictionaryUrl = getDictionaryUrl(entry.word, entry.language)
  const dictionaryName = getDictionaryName(entry.language)

  const handleSaveNotes = () => {
    if (onUpdateNotes) {
      onUpdateNotes(notes)
    }
    setIsEditingNotes(false)
  }

  const handleCancelNotes = () => {
    setNotes(entry.notes || '')
    setIsEditingNotes(false)
  }

  const handleDelete = () => {
    onRemove()
    setShowConfirmDelete(false)
  }

  return (
    <div className="rounded-xl border-2 border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-600 dark:bg-slate-800">
      <div className="flex items-start justify-between gap-4">
        {/* 左侧:单词信息 */}
        <div className="flex-1 space-y-2">
          {/* 单词 */}
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {entry.word}
          </div>

          {/* 中文释义 */}
          <div className="text-lg text-slate-700 dark:text-slate-300">{entry.translation}</div>

          {/* 元信息 */}
          <div className="flex flex-wrap gap-1.5 text-xs">
            {/* 分类 */}
            {entry.groupCategory && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                📂 {entry.groupCategory}
              </span>
            )}

            {/* 来源关卡 */}
            {entry.levelId && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                🎮 {entry.levelId}
              </span>
            )}
          </div>

          {/* 时间和复习信息 */}
          <div className="text-xs text-slate-500 dark:text-slate-400">
            添加于: {new Date(entry.addedAt).toLocaleDateString('zh-CN')}
            {entry.reviewCount > 0 && ` · 已复习 ${entry.reviewCount} 次`}
            {entry.lastReviewedAt &&
              ` · 最后复习: ${new Date(entry.lastReviewedAt).toLocaleDateString('zh-CN')}`}
          </div>

          {/* 笔记 */}
          {isEditingNotes ? (
            <div className="space-y-2">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
                rows={3}
                placeholder="添加笔记..."
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNotes}
                  className="rounded-lg bg-primary px-3 py-1 text-sm text-white hover:bg-primary-dark"
                >
                  保存
                </button>
                <button
                  onClick={handleCancelNotes}
                  className="rounded-lg bg-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            entry.notes && (
              <div className="rounded-lg bg-amber-50 p-2 text-sm text-slate-700 dark:bg-amber-900/20 dark:text-slate-300">
                📝 {entry.notes}
              </div>
            )
          )}
        </div>

        {/* 右侧:操作按钮 */}
        <div className="flex flex-col gap-2">
          {/* 查词典 */}
          <a
            href={dictionaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
            title={`在${dictionaryName}中查看`}
          >
            🔍 词典
          </a>

          {/* 编辑笔记 */}
          {!isEditingNotes && (
            <button
              onClick={() => setIsEditingNotes(true)}
              className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            >
              📝 笔记
            </button>
          )}

          {/* 删除 */}
          {showConfirmDelete ? (
            <div className="flex flex-col gap-1">
              <button
                onClick={handleDelete}
                className="rounded-lg bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                确认删除
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="rounded-lg bg-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-300"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              🗑️ 删除
            </button>
          )}
        </div>
      </div>
    </div>
  )
}


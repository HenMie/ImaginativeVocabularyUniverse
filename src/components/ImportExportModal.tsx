import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { STORAGE_EXPORT_FILENAME } from '../constants/storage'
import { useProgressStore } from '../store/progressStore'
import { decodeProgressPayload, encodeProgressPayload } from '../utils/progressCodec'
import { ModalTransition } from './ModalTransition'

interface ImportExportModalProps {
  open: boolean
  onClose: () => void
}

export const ImportExportModal = ({ open, onClose }: ImportExportModalProps) => {
  const progress = useProgressStore((state) => state.progress)
  const importProgress = useProgressStore((state) => state.importProgress)

  const [raw, setRaw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open) {
      setRaw(encodeProgressPayload(progress))
      setError(null)
      setCopied(false)
    }
  }, [open, progress])

  if (!open) return null

  const handleExport = () => {
    const payload = encodeProgressPayload(progress)
    const blob = new Blob([payload], {
      type: 'text/plain;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = STORAGE_EXPORT_FILENAME
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    if (!window.confirm('确认覆盖当前进度？此操作不可撤销。')) {
      return
    }
    try {
      const parsed = decodeProgressPayload(raw)
      importProgress(parsed)
      setError(null)
      onClose()
    } catch (err) {
      console.error(err)
      setError('导入失败，请确认文本内容完整且未被破坏')
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(raw.trim())
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error(err)
      setError('无法写入剪贴板，请手动复制')
    }
  }

  return (
    <ModalTransition isOpen={open} onClose={onClose}>
      <div className="flex w-full max-w-xl flex-col gap-4 p-6">
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-dark-text">导入 / 导出存档</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-200 px-3 py-1 text-sm text-slate-600 transition-all-smooth hover:bg-slate-300 hover:scale-105 pressable gpu-accelerated dark:bg-dark-surfaceSecondary dark:text-dark-textSecondary dark:hover:bg-dark-border"
          >
            关闭
          </button>
        </header>
        <p className="text-xs text-slate-500 dark:text-dark-textMuted">
          复制保存或粘贴导入，导入会覆盖当前进度，请谨慎操作。
        </p>
        <textarea
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          spellCheck={false}
          className="h-64 w-full rounded-2xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-700 transition-all-smooth focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 gpu-accelerated dark:border-dark-border dark:bg-dark-surface dark:text-dark-text dark:focus:ring-dark-primary/40"
        />
        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={clsx(
                'rounded-full px-4 py-2 text-sm font-medium transition-all-smooth hover:scale-105 pressable gpu-accelerated',
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-primary/10 text-primary hover:bg-primary/20 dark:bg-dark-primary/20 dark:text-dark-primary dark:hover:bg-dark-primary/30'
              )}
            >
              {copied ? '已复制' : '复制存档'}
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-full bg-accent-blue/20 px-4 py-2 text-sm font-medium text-sky-600 hover:bg-accent-blue/30 dark:bg-dark-accent/blue/20 dark:text-dark-accent/sky dark:hover:bg-dark-accent/blue/30"
            >
              导出为文件
            </button>
          </div>
          <button
            type="button"
            onClick={handleImport}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow transition-all-smooth hover:bg-primary-dark hover:scale-105 hover:shadow-lg pressable gpu-accelerated dark:bg-dark-primary dark:hover:bg-dark-primary-dark"
          >
            导入进度
          </button>
        </div>
      </div>
    </ModalTransition>
  )
}


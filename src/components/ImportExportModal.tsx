import { useEffect, useState } from 'react'
import { STORAGE_EXPORT_FILENAME } from '../constants/storage'
import { useProgressStore } from '../store/progressStore'
import type { PlayerProgress } from '../types/progress'

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
      setRaw(JSON.stringify(progress, null, 2))
      setError(null)
      setCopied(false)
    }
  }, [open, progress])

  if (!open) return null

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(progress, null, 2)], {
      type: 'application/json',
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
      const parsed = JSON.parse(raw) as PlayerProgress
      importProgress(parsed)
      setError(null)
      onClose()
    } catch (err) {
      console.error(err)
      setError('导入失败，请确认 JSON 格式无误')
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(raw)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error(err)
      setError('无法写入剪贴板，请手动复制')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur">
      <div className="flex w-full max-w-xl flex-col gap-4 rounded-3xl bg-surface p-6 shadow-2xl">
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">导入 / 导出存档</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-200 px-3 py-1 text-sm text-slate-600 hover:bg-slate-300"
          >
            关闭
          </button>
        </header>
        <p className="text-xs text-slate-500">
          可复制 JSON 文本备份，或粘贴导入。导入会覆盖当前进度，请谨慎操作。
        </p>
        <textarea
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          className="h-64 w-full rounded-2xl border border-slate-200 bg-white p-3 font-mono text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20"
            >
              {copied ? '已复制' : '复制 JSON'}
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-full bg-accent-blue/20 px-4 py-2 text-sm font-medium text-sky-600 hover:bg-accent-blue/30"
            >
              导出为文件
            </button>
          </div>
          <button
            type="button"
            onClick={handleImport}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white shadow hover:bg-primary-dark"
          >
            导入进度
          </button>
        </div>
      </div>
    </div>
  )
}


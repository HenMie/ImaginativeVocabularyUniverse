import type { GroupColorPreset } from '../constants/groupColors'
import type { CompletedGroup } from '../utils/board'
import { useEffect, useRef } from 'react'
import { getTileDisplayText, pickTranslation } from '../utils/translation'

interface GroupRowProps {
  group: CompletedGroup
  colorPreset?: GroupColorPreset
  wordLanguage: string
  definitionLanguages?: string[]
}

export const GroupRow = ({
  group,
  colorPreset,
  wordLanguage,
  definitionLanguages,
}: GroupRowProps) => {
  const background = colorPreset?.rowBackground ?? '#E2E8F0'
  const border = colorPreset?.border ?? 'rgba(203,213,225,0.7)'
  const badgeBg = colorPreset?.badgeBackground ?? '#1E3A8A'
  const badgeText = colorPreset?.badgeText ?? '#FFFFFF'
  const ref = useRef<HTMLDivElement>(null)
  const isVisible = useRef(false)

  useEffect(() => {
    const element = ref.current
    if (!element || isVisible.current) return

    element.style.opacity = '0'
    element.style.transform = 'translateY(20px) scale(0.95)'

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        element.style.transition = 'opacity 0.35s var(--ease-out-cubic), transform 0.35s var(--ease-out-cubic)'
        element.style.opacity = '1'
        element.style.transform = 'translateY(0) scale(1)'
        isVisible.current = true
      })
    })
  }, [])

  return (
    <div
      ref={ref}
      className="group-row flex w-full flex-col gap-1.5 rounded-2xl border px-3 py-2 shadow-sm hover-lift gpu-accelerated"
      style={{
        backgroundColor: background,
        borderColor: border,
        transition: 'background-color 0.25s var(--ease-out-cubic), border-color 0.25s var(--ease-out-cubic)',
      }}
    >
      <header className="flex items-center justify-between">
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ backgroundColor: badgeBg, color: badgeText }}
        >
          {group.group.category}
        </span>
        <span className="text-[10px] text-slate-500">
          {new Date(group.completedAt).toLocaleTimeString()}
        </span>
      </header>
      <div className="grid grid-cols-2 gap-1.5 text-sm sm:grid-cols-4">
        {group.tiles.map((tile) => (
          <div
            key={tile.instanceId}
            className="rounded-xl bg-white/80 px-2 py-1 text-center shadow-inner"
            style={{ color: colorPreset?.text ?? '#1F2937' }}
          >
            <div className="text-sm font-semibold">{getTileDisplayText(tile.data, wordLanguage)}</div>
            <div className="text-xs text-slate-500">
              {pickTranslation(tile.data.translations, definitionLanguages?.[0])}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

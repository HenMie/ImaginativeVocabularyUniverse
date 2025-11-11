import type { GroupColorPreset } from '../constants/groupColors'
import type { CompletedGroup } from '../utils/board'
import { getTileDisplayText, getCategoryText } from '../utils/translation'

interface CompletedRowProps {
  group: CompletedGroup
  colorPreset?: GroupColorPreset
  columns: number
  wordLanguage: string
}

export const CompletedRow = ({ group, colorPreset, columns, wordLanguage }: CompletedRowProps) => {
  const background = colorPreset?.rowBackground ?? '#E2E8F0'
  const border = colorPreset?.border ?? 'rgba(203,213,225,0.7)'
  const badgeBg = colorPreset?.badgeBackground ?? '#1E3A8A'
  const badgeText = colorPreset?.badgeText ?? '#FFFFFF'
  const textColor = colorPreset?.text ?? '#1F2937'

  return (
    <div
      className="flex min-h-[44px] items-center gap-2 rounded-xl border-2 px-3 py-2 shadow-md"
      style={{
        backgroundColor: background,
        borderColor: border,
        gridColumn: `1 / ${columns + 1}`,
      }}
    >
      <div className="flex-shrink-0">
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{ backgroundColor: badgeBg, color: badgeText }}
        >
          {getCategoryText(group.group.category, wordLanguage)}
        </span>
      </div>
      <div className="flex flex-1 items-center justify-around gap-1">
        {group.tiles.map((tile) => (
          <span
            key={tile.instanceId}
            className="text-base font-semibold"
            style={{ color: textColor }}
          >
            {getTileDisplayText(tile.data, wordLanguage)}
          </span>
        ))}
      </div>
    </div>
  )
}


import type { GroupColorPreset } from '../constants/groupColors'
import type { CompletedGroup } from '../utils/board'

interface GroupRowProps {
  group: CompletedGroup
  colorPreset?: GroupColorPreset
}

export const GroupRow = ({ group, colorPreset }: GroupRowProps) => {
  const background = colorPreset?.rowBackground ?? '#E2E8F0'
  const border = colorPreset?.border ?? 'rgba(203,213,225,0.7)'
  const badgeBg = colorPreset?.badgeBackground ?? '#1E3A8A'
  const badgeText = colorPreset?.badgeText ?? '#FFFFFF'

  return (
    <div
      className="flex w-full flex-col gap-2 rounded-3xl border px-4 py-3 shadow-sm"
      style={{ backgroundColor: background, borderColor: border }}
    >
      <header className="flex items-center justify-between">
        <span
          className="rounded-full px-3 py-[2px] text-xs font-semibold"
          style={{ backgroundColor: badgeBg, color: badgeText }}
        >
          {group.group.category}
        </span>
        <span className="text-[11px] text-slate-500">
          {new Date(group.completedAt).toLocaleTimeString()}
        </span>
      </header>
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {group.tiles.map((tile) => (
          <div
            key={tile.instanceId}
            className="rounded-2xl bg-white/80 px-3 py-2 text-center shadow-inner"
            style={{ color: colorPreset?.text ?? '#1F2937' }}
          >
            <div className="text-sm font-semibold">{tile.data.text}</div>
            <div className="text-xs text-slate-500">
              {tile.data.translations.zh ?? Object.values(tile.data.translations)[0] ?? '——'}
            </div>
          </div>
        ))}
      </div>
      {group.group.resultTile && (
        <div className="rounded-2xl bg-white px-4 py-2 text-center text-xs text-slate-500 shadow-inner">
          合成词块：{group.group.resultTile.text}（
          {group.group.resultTile.translations.zh ?? '——'}）
        </div>
      )}
    </div>
  )
}


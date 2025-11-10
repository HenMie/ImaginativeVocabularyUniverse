import clsx from 'clsx'
import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { useDragLayer } from 'react-dnd'
import { DND_ITEM_TYPES } from '../constants/dnd'
import type { GroupColorPreset } from '../constants/groupColors'
import type { TileInstance } from '../utils/board'

interface DragLayerItem {
  instanceId: string
  tile: TileInstance
  groupColor?: GroupColorPreset
  width?: number
  height?: number
}

const layerStyles: CSSProperties = {
  pointerEvents: 'none',
  position: 'fixed',
  zIndex: 1000,
  left: 0,
  top: 0,
}

export const TileDragLayer = () => {
  const { item, itemType, isDragging, currentOffset, initialClientOffset, initialSourceOffset } =
    useDragLayer((monitor) => ({
      item: monitor.getItem() as DragLayerItem | undefined,
      itemType: monitor.getItemType(),
      isDragging: monitor.isDragging(),
      currentOffset: monitor.getClientOffset(),
      initialClientOffset: monitor.getInitialClientOffset(),
      initialSourceOffset: monitor.getInitialSourceClientOffset(),
    }))

  const style = useMemo(() => {
    if (!item || !currentOffset) return null
    let x = currentOffset.x
    let y = currentOffset.y
    if (initialClientOffset && initialSourceOffset) {
      const dx = currentOffset.x - initialClientOffset.x
      const dy = currentOffset.y - initialClientOffset.y
      x = initialSourceOffset.x + dx
      y = initialSourceOffset.y + dy
    }
    const width = item.width ?? undefined
    const height = item.height ?? undefined
    return {
      ...layerStyles,
      transform: `translate(${x}px, ${y}px)`,
      width,
      height,
    } satisfies CSSProperties
  }, [currentOffset, initialClientOffset, initialSourceOffset, item])

  if (!isDragging || itemType !== DND_ITEM_TYPES.TILE || !item || !style) {
    return null
  }

  const { tile, groupColor } = item
  const isCompleted = tile.status === 'completed'

  const background = groupColor
    ? isCompleted
      ? groupColor.rowBackground ?? groupColor.background
      : groupColor.background
    : '#F8FAFC'
  const border = groupColor?.border ?? 'rgba(203, 213, 225, 0.7)'
  const color = groupColor?.text ?? '#1e293b'

  return (
    <div
      style={{
        ...style,
      }}
    >
      <div
        className="pointer-events-none flex h-full w-full select-none items-center justify-center rounded-xl border-2 px-2 py-1 text-center text-base font-semibold shadow-2xl"
        style={{
          backgroundColor: background,
          borderColor: border,
          color,
        }}
      >
        <span
          className={clsx(
            'px-0.5 text-balance',
            (tile.data.text?.length ?? 0) > 6 && 'text-sm',
          )}
        >
          {tile.data.text ?? '——'}
        </span>
      </div>
    </div>
  )
}



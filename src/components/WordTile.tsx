import clsx from 'clsx'
import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import { useDrag, useDrop } from 'react-dnd'
import { getEmptyImage } from 'react-dnd-html5-backend'
import { DND_ITEM_TYPES } from '../constants/dnd'
import type { TileInstance } from '../utils/board'
import type { GroupColorPreset } from '../constants/groupColors'

interface DragItem {
  type: string
  index: number
  instanceId: string
  tile: TileInstance
  groupColor?: GroupColorPreset
  width?: number
  height?: number
}

interface WordTileProps {
  tile: TileInstance
  index: number
  moveTile: (from: number, to: number) => void
  onClick: (tile: TileInstance, index: number) => void
  isHighlighted?: boolean
  highlightContext?:
    | 'hint'
    | 'assemble'
    | 'verify-reveal-success'
    | 'verify-reveal-fail'
    | 'complete'
    | 'result'
  highlightPreset?: GroupColorPreset
  groupColor?: GroupColorPreset
  tileOverrideColor?: GroupColorPreset
}

export const WordTile = ({
  tile,
  index,
  moveTile,
  onClick,
  isHighlighted = false,
  highlightContext,
  highlightPreset,
  groupColor,
  tileOverrideColor,
}: WordTileProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const isCompleted = tile.status === 'completed'
  const isDraggable = tile.status === 'available' && !isCompleted

  const [{ isOver, canDrop }, drop] = useDrop<DragItem, void, { isOver: boolean; canDrop: boolean }>({
    accept: DND_ITEM_TYPES.TILE,
    canDrop: (item) => item.instanceId !== tile.instanceId && isDraggable,
    drop: (item) => {
      if (!isDraggable || item.index === index) return
      moveTile(item.index, index)
      item.index = index
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  })

  const paletteForDrag = tileOverrideColor ?? groupColor ?? highlightPreset

  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: DND_ITEM_TYPES.TILE,
      item: () => {
        const rect = ref.current?.getBoundingClientRect()
        return {
          type: DND_ITEM_TYPES.TILE,
          index,
          instanceId: tile.instanceId,
          tile,
          groupColor: paletteForDrag,
          width: rect?.width,
          height: rect?.height,
        }
      },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      canDrag: () => isDraggable,
    }),
    [index, isDraggable, paletteForDrag, tile.instanceId, tile],
  )

  drag(drop(ref))

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true })
  }, [preview])

  const palette = tileOverrideColor ?? groupColor

  const highlightRing = isHighlighted
    ? highlightContext === 'verify-reveal-fail'
      ? 'ring-4 ring-rose-300'
      : highlightContext === 'verify-reveal-success'
      ? 'ring-4 ring-emerald-300'
      : 'ring-4 ring-primary/40'
    : ''

  const baseStyle: CSSProperties = {
    backgroundColor: '#F8FAFC',
    borderColor: 'rgba(203, 213, 225, 0.7)',
    color: '#1e293b',
  }

  if (palette) {
    const useRowBackground = isCompleted || !!tileOverrideColor
    baseStyle.backgroundColor = useRowBackground
      ? palette.rowBackground ?? palette.background
      : palette.background
    baseStyle.borderColor = palette.border
    baseStyle.color = palette.text
  }

  if (isHighlighted) {
    if (highlightContext === 'verify-reveal-success' || highlightContext === 'verify-reveal-fail') {
      const highlightPalette = highlightPreset ?? palette ?? groupColor
      const highlightBackground =
        highlightContext === 'verify-reveal-success'
          ? highlightPalette?.rowBackground ?? highlightPalette?.background ?? '#DBEAFE'
          : highlightPalette?.background ?? '#DBEAFE'
      baseStyle.backgroundColor = highlightBackground
      baseStyle.borderColor = highlightPalette?.border ?? '#2563EB'
      baseStyle.color = highlightPalette?.text ?? '#1e293b'
      baseStyle.boxShadow =
        highlightContext === 'verify-reveal-fail'
          ? '0 0 0 3px rgba(248,113,113,0.45)'
          : '0 0 0 3px rgba(16,185,129,0.35)'
    } else if (
      highlightContext === 'hint' ||
      highlightContext === 'assemble' ||
      highlightContext === 'result'
    ) {
      baseStyle.boxShadow = `0 0 0 4px ${palette?.accent ?? 'rgba(59,130,246,0.35)'}`
    }
  }

  if (isCompleted && !groupColor) {
    baseStyle.backgroundColor = '#ECFDF5'
    baseStyle.borderColor = '#A7F3D0'
    baseStyle.color = '#047857'
  }

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={() => onClick(tile, index)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick(tile, index)
        }
      }}
      className={clsx(
        'word-tile relative flex min-h-[44px] w-full select-none flex-col items-center justify-center rounded-xl border-2 px-2 py-1 text-center text-base font-semibold shadow-md transition-all-smooth focus:outline-none focus:ring-4 focus:ring-primary/30 gpu-accelerated',
        !isDraggable
          ? 'cursor-default'
          : 'cursor-grab active:cursor-grabbing hover-lift pressable',
        isDragging && 'opacity-0 scale-95', // 拖拽时原位置隐藏并缩小
        !isDragging && isOver && canDrop && 'drop-target-indicator', // 拖拽目标高亮
        isHighlighted && highlightContext === 'hint' && 'animate-pulse',
        isHighlighted && highlightContext === 'verify-reveal-success' && 'success-pulse',
        isHighlighted && highlightContext === 'verify-reveal-fail' && 'error-shake',
        highlightRing,
      )}
      style={baseStyle}
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
  )
}


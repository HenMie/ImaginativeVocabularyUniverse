import { useEffect, useState } from 'react'
import type { GroupColorPreset } from '../constants/groupColors'
import type { CompletedGroup } from '../utils/board'
import { getTileDisplayText, getCategoryText } from '../utils/translation'

interface AnimatedCompletedRowProps {
  group: CompletedGroup
  colorPreset?: GroupColorPreset
  columns: number
  wordLanguage: string
  isAnimating: boolean
}

export const AnimatedCompletedRow = ({
  group,
  colorPreset,
  columns,
  wordLanguage,
  isAnimating
}: AnimatedCompletedRowProps) => {
  const [animationPhase, setAnimationPhase] = useState(0)

  const background = colorPreset?.rowBackground ?? '#E2E8F0'
  const border = colorPreset?.border ?? 'rgba(203,213,225,0.7)'
  const badgeBg = colorPreset?.badgeBackground ?? '#1E3A8A'
  const badgeText = colorPreset?.badgeText ?? '#FFFFFF'
  const textColor = colorPreset?.text ?? '#1F2937'

  useEffect(() => {
    if (!isAnimating) {
      setAnimationPhase(3) // Final state
      return
    }

    // Animation sequence
    const timers = [
      setTimeout(() => setAnimationPhase(1), 300),  // Tile glow
      setTimeout(() => setAnimationPhase(2), 800),  // Tile merge
      setTimeout(() => setAnimationPhase(3), 1500), // Final form
    ]

    return () => timers.forEach(clearTimeout)
  }, [isAnimating])

  const getTileAnimation = (index: number) => {
    if (!isAnimating || animationPhase >= 3) return ''

    const delay = index * 100 // Stagger tile animations

    switch (animationPhase) {
      case 1: // Glow phase
        return `animate-pulse delay-${delay}`
      case 2: // Merge phase
        return `transition-all duration-700 ease-out transform ${
          animationPhase >= 2 ? 'scale-110' : 'scale-100'
        }`
      default:
        return ''
    }
  }

  const getRowAnimation = () => {
    if (!isAnimating) return ''

    switch (animationPhase) {
      case 0: // Initial hidden state
        return 'opacity-0 scale-95'
      case 1: // Fade in
        return 'opacity-100 scale-100 transition-all duration-500 ease-out'
      case 2: // Emphasis
        return 'transform transition-all duration-700 ease-out scale-105'
      case 3: // Final state
        return 'transform transition-all duration-500 ease-out scale-100'
      default:
        return ''
    }
  }

  const getBadgeAnimation = () => {
    if (!isAnimating || animationPhase < 2) return ''

    return animationPhase === 2
      ? 'animate-bounce'
      : 'transition-all duration-300 ease-out'
  }

  return (
    <div
      className={`
        flex min-h-[44px] items-center gap-2 rounded-xl border-2 px-3 py-2 shadow-md
        ${getRowAnimation()}
      `}
      style={{
        backgroundColor: background,
        borderColor: border,
        gridColumn: `1 / ${columns + 1}`,
      }}
    >
      <div className="flex-shrink-0">
        <span
          className={`
            rounded-full px-3 py-1 text-xs font-semibold
            ${getBadgeAnimation()}
          `}
          style={{ backgroundColor: badgeBg, color: badgeText }}
        >
          {getCategoryText(group.group.category, wordLanguage)}
        </span>
      </div>
      <div className="flex flex-1 items-center justify-around gap-1">
        {group.tiles.map((tile, index) => (
          <span
            key={tile.instanceId}
            className={`
              text-base font-semibold
              ${getTileAnimation(index)}
            `}
            style={{
              color: textColor,
              textShadow: isAnimating && animationPhase === 1 ? '0 0 20px rgba(255,255,255,0.8)' : 'none'
            }}
          >
            {getTileDisplayText(tile.data, wordLanguage)}
          </span>
        ))}
      </div>

      {/* Sparkle effects during animation */}
      {isAnimating && animationPhase >= 1 && animationPhase < 3 && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-ping"
              style={{
                left: `${20 + i * 15}%`,
                top: `${30 + (i % 2) * 40}%`,
                animationDelay: `${i * 200}ms`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
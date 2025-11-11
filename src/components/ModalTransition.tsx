import { type ReactNode, useRef, useEffect } from 'react'

interface ModalTransitionProps {
  children: ReactNode
  isOpen: boolean
  onClose: () => void
  backdropClassName?: string
}

export const ModalTransition = ({
  children,
  isOpen,
  onClose,
  backdropClassName = '',
}: ModalTransitionProps) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const modal = modalRef.current
    const backdrop = backdropRef.current
    if (!modal || !backdrop) return

    if (isOpen) {
      // 设置初始状态
      backdrop.style.opacity = '0'
      modal.style.opacity = '0'
      modal.style.transform = 'scale(0.9) translateY(20px)'

      // 显示元素
      backdrop.style.display = 'flex'
      modal.style.display = 'flex'

      // 防止body滚动
      document.body.style.overflow = 'hidden'

      // 触发进入动画
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          backdrop.style.transition = 'opacity 0.15s var(--ease-out-cubic)'
          modal.style.transition = 'opacity 0.25s var(--ease-out-cubic), transform 0.25s var(--ease-spring)'

          backdrop.style.opacity = '1'
          modal.style.opacity = '1'
          modal.style.transform = 'scale(1) translateY(0)'
        })
      })
    } else {
      // 触发退出动画
      backdrop.style.transition = 'opacity 0.15s var(--ease-out-cubic)'
      modal.style.transition = 'opacity 0.15s var(--ease-in-out-cubic), transform 0.15s var(--ease-in-out-cubic)'

      backdrop.style.opacity = '0'
      modal.style.opacity = '0'
      modal.style.transform = 'scale(0.95) translateY(-10px)'

      // 动画完成后隐藏元素
      const timer = setTimeout(() => {
        backdrop.style.display = 'none'
        modal.style.display = 'none'
        document.body.style.overflow = ''
      }, 150)

      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // 点击背景关闭
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) {
      onClose()
    }
  }

  return (
    <div
      ref={backdropRef}
      className={`fixed inset-0 z-50 hidden items-center justify-center bg-black/50 backdrop-blur-sm ${backdropClassName}`}
      onClick={handleBackdropClick}
      style={{ display: 'none' }}
    >
      <div
        ref={modalRef}
        className="relative flex max-h-[90vh] w-[90vw] max-w-lg flex-col items-center justify-center rounded-2xl bg-white shadow-2xl dark:bg-dark-surface dark:shadow-dark-tile"
        style={{ display: 'none' }}
      >
        {children}
      </div>
    </div>
  )
}

// 提供更简单的底部Sheet风格的动画
export const SheetTransition = ({
  children,
  isOpen,
  onClose,
}: {
  children: ReactNode
  isOpen: boolean
  onClose: () => void
}) => {
  const sheetRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const sheet = sheetRef.current
    const backdrop = backdropRef.current
    if (!sheet || !backdrop) return

    if (isOpen) {
      // 初始状态
      backdrop.style.opacity = '0'
      sheet.style.transform = 'translateY(100%)'

      // 显示元素
      backdrop.style.display = 'flex'
      sheet.style.display = 'flex'
      document.body.style.overflow = 'hidden'

      // 触发进入动画
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          backdrop.style.transition = 'opacity 0.15s var(--ease-out-cubic)'
          sheet.style.transition = 'transform 0.35s var(--ease-out-cubic)'

          backdrop.style.opacity = '1'
          sheet.style.transform = 'translateY(0)'
        })
      })
    } else {
      // 触发退出动画
      backdrop.style.transition = 'opacity 0.15s var(--ease-out-cubic)'
      sheet.style.transition = 'transform 0.25s var(--ease-in-out-cubic)'

      backdrop.style.opacity = '0'
      sheet.style.transform = 'translateY(100%)'

      // 动画完成后隐藏元素
      const timer = setTimeout(() => {
        backdrop.style.display = 'none'
        sheet.style.display = 'none'
        document.body.style.overflow = ''
      }, 250)

      return () => clearTimeout(timer)
    }
  }, [isOpen])

  return (
    <div
      ref={backdropRef}
      className="fixed inset-x-0 inset-y-0 z-50 hidden flex-col items-end justify-end bg-black/30 backdrop-blur-sm"
      style={{ display: 'none' }}
      onClick={() => onClose()}
    >
      <div
        ref={sheetRef}
        className="flex w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-2xl dark:bg-dark-surface dark:shadow-dark-tile"
        style={{ display: 'none' }}
      >
        <div className="mb-2 flex justify-center pt-3">
          <div className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-dark-border" />
        </div>
        {children}
      </div>
    </div>
  )
}
import { useState, useRef } from 'react'
import { useMicroInteractions } from '../hooks/useMicroInteractions'
import { ModalTransition } from './ModalTransition'

export const AnimationDemo = () => {
  const [showModal, setShowModal] = useState(false)
  const [animationState, setAnimationState] = useState<'idle' | 'success' | 'error'>('idle')
  const { triggerFeedback } = useMicroInteractions()
  const demoRef = useRef<HTMLDivElement>(null)

  const handleDemoClick = (effect: string) => {
    if (!demoRef.current) return

    switch (effect) {
      case 'ripple':
        // 模拟涟漪效果
        demoRef.current.classList.add('ripple-expand', 'active')
        setTimeout(() => {
          demoRef.current?.classList.remove('active')
        }, 600)
        triggerFeedback('light', 'click')
        break

      case 'success':
        setAnimationState('success')
        demoRef.current.classList.add('success-pulse')
        triggerFeedback('success', 'success')
        setTimeout(() => {
          setAnimationState('idle')
          demoRef.current?.classList.remove('success-pulse')
        }, 1000)
        break

      case 'error':
        setAnimationState('error')
        demoRef.current.classList.add('error-shake')
        triggerFeedback('error', 'error')
        setTimeout(() => {
          setAnimationState('idle')
          demoRef.current?.classList.remove('error-shake')
        }, 500)
        break

      case 'bounce':
        demoRef.current.classList.add('animate-bounce-medium')
        triggerFeedback('medium')
        setTimeout(() => {
          demoRef.current?.classList.remove('animate-bounce-medium')
        }, 800)
        break

      case 'glow':
        demoRef.current.classList.add('animate-glow')
        setTimeout(() => {
          demoRef.current?.classList.remove('animate-glow')
        }, 3000)
        break

      case 'float':
        demoRef.current.classList.add('animate-float')
        setTimeout(() => {
          demoRef.current?.classList.remove('animate-float')
        }, 4000)
        break
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-center text-4xl font-bold text-gray-800 animate-fade-in">
          🎨 Apple风格动效演示
        </h1>

        {/* 主要演示区域 */}
        <div className="mb-8 flex justify-center">
          <div
            ref={demoRef}
            className="relative h-32 w-64 rounded-2xl bg-white shadow-lg transition-all-smooth hover:shadow-xl"
            style={{
              background: animationState === 'success'
                ? 'linear-gradient(135deg, #10b981, #059669)'
                : animationState === 'error'
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
            }}
          >
            <div className="flex h-full items-center justify-center text-white">
              <span className="text-lg font-semibold">
                {animationState === 'success' && '✅ 成功动画'}
                {animationState === 'error' && '❌ 错误动画'}
                {animationState === 'idle' && '🎯 演示区域'}
              </span>
            </div>
          </div>
        </div>

        {/* 动效按钮网格 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => handleDemoClick('ripple')}
            className="rounded-xl bg-blue-500 px-6 py-4 text-white transition-all-smooth hover:bg-blue-600 hover:scale-105 pressable shadow-md hover:shadow-lg"
          >
            💧 涟漪效果
          </button>

          <button
            onClick={() => handleDemoClick('success')}
            className="rounded-xl bg-emerald-500 px-6 py-4 text-white transition-all-smooth hover:bg-emerald-600 hover:scale-105 pressable shadow-md hover:shadow-lg"
          >
            ✨ 成功脉冲
          </button>

          <button
            onClick={() => handleDemoClick('error')}
            className="rounded-xl bg-rose-500 px-6 py-4 text-white transition-all-smooth hover:bg-rose-600 hover:scale-105 pressable shadow-md hover:shadow-lg"
          >
            ⚠️ 错误震动
          </button>

          <button
            onClick={() => handleDemoClick('bounce')}
            className="rounded-xl bg-purple-500 px-6 py-4 text-white transition-all-smooth hover:bg-purple-600 hover:scale-105 pressable shadow-md hover:shadow-lg"
          >
            🎾 弹跳动画
          </button>

          <button
            onClick={() => handleDemoClick('glow')}
            className="rounded-xl bg-amber-500 px-6 py-4 text-white transition-all-smooth hover:bg-amber-600 hover:scale-105 pressable shadow-md hover:shadow-lg"
          >
            💫 发光效果
          </button>

          <button
            onClick={() => handleDemoClick('float')}
            className="rounded-xl bg-cyan-500 px-6 py-4 text-white transition-all-smooth hover:bg-cyan-600 hover:scale-105 pressable shadow-md hover:shadow-lg"
          >
            🎈 漂浮动画
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="rounded-xl bg-indigo-500 px-6 py-4 text-white transition-all-smooth hover:bg-indigo-600 hover:scale-105 pressable shadow-md hover:shadow-lg"
          >
            🪟 模态窗口
          </button>
        </div>

        {/* 说明文字 */}
        <div className="mt-12 rounded-2xl bg-white/80 p-6 shadow-md backdrop-blur">
          <h2 className="mb-4 text-2xl font-bold text-gray-800">🎯 动效特性</h2>
          <ul className="space-y-2 text-gray-600">
            <li>• <strong>自然缓动:</strong> 基于物理的Apple风格缓动曲线</li>
            <li>• <strong>触觉反馈:</strong> 支持设备振动和音效反馈</li>
            <li>• <strong>GPU加速:</strong> 使用transform3d确保60fps流畅度</li>
            <li>• <strong>智能优化:</strong> 视口检测和页面可见性管理</li>
            <li>• <strong>无障碍支持:</strong> 遵循减少动画偏好设置</li>
          </ul>
        </div>

        {/* 状态指示器 */}
        <div className="mt-8 flex justify-center">
          <div className="status-indicator flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-white">
            🔵
          </div>
        </div>

        {/* 加载动画演示 */}
        <div className="mt-8 flex justify-center">
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>

      {/* 模态窗口演示 */}
      <ModalTransition isOpen={showModal} onClose={() => setShowModal(false)}>
        <div className="p-6">
          <h2 className="mb-4 text-2xl font-bold text-gray-800">🪟 模态窗口演示</h2>
          <p className="mb-6 text-gray-600">
            这是一个使用Apple风格动画的模态窗口，具有弹性进入效果和平滑的背景模糊。
          </p>
          <button
            onClick={() => setShowModal(false)}
            className="rounded-full bg-blue-500 px-6 py-2 text-white transition-all-smooth hover:bg-blue-600 hover:scale-105 pressable"
          >
            关闭
          </button>
        </div>
      </ModalTransition>
    </div>
  )
}
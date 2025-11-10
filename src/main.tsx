import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { DndProvider } from 'react-dnd'
import type { BackendFactory } from 'dnd-core'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend, type TouchBackendOptions } from 'react-dnd-touch-backend'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { useProgressStore } from './store/progressStore'
import './index.css'

const getBackendConfig = (): {
  backend: BackendFactory
  options?: TouchBackendOptions
} => {
  if (typeof window === 'undefined') {
    return { backend: HTML5Backend }
  }

  const nav = window.navigator as Navigator & {
    msMaxTouchPoints?: number
  }
  const isTouch =
    'ontouchstart' in window || nav.maxTouchPoints > 0 || (nav.msMaxTouchPoints ?? 0) > 0

  if (isTouch) {
    return {
      backend: TouchBackend,
      options: {
        enableMouseEvents: true,
        enableTouchEvents: true,
        enableKeyboardEvents: false,
        ignoreContextMenu: true,
        enableHoverOutsideTarget: false,
        delay: 0,
        delayTouchStart: 0,
        delayMouseStart: 0,
        touchSlop: 20,
        rootElement: document,
      },
    }
  }

  return { backend: HTML5Backend }
}

const { backend, options } = getBackendConfig()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <DndProvider backend={backend} options={options}>
        <App />
      </DndProvider>
    </BrowserRouter>
  </React.StrictMode>
)

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true)
    },
    onOfflineReady() {
      console.info('脑洞外语词场已准备好离线使用')
    },
  })
}

// 调试模式控制台命令
if (typeof window !== 'undefined') {
  ;(window as any).__DEBUG_MODE__ = {
    toggle: () => {
      const state = useProgressStore.getState()
      state.toggleDebugMode()
      const newState = useProgressStore.getState()
      console.log(
        `%c调试模式已${newState.debugMode ? '开启' : '关闭'}`,
        `color: ${newState.debugMode ? '#10b981' : '#ef4444'}; font-weight: bold; font-size: 14px;`
      )
      if (newState.debugMode) {
        console.log('%c调试模式功能：', 'font-weight: bold;')
        console.log('  - 无限金币（所有消耗免费）')
        console.log('  - 全部关卡解锁')
        console.log('  - 使用 window.__DEBUG_MODE__.toggle() 切换')
      }
    },
    status: () => {
      const state = useProgressStore.getState()
      console.log(
        `%c调试模式：${state.debugMode ? '已开启' : '已关闭'}`,
        `color: ${state.debugMode ? '#10b981' : '#6b7280'}; font-weight: bold;`
      )
    },
  }
  
  console.log(
    '%c调试模式控制台命令已加载',
    'color: #3b82f6; font-weight: bold;'
  )
  console.log('使用 window.__DEBUG_MODE__.toggle() 切换调试模式')
  console.log('使用 window.__DEBUG_MODE__.status() 查看当前状态')
}


import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { DndProvider } from 'react-dnd'
import type { BackendFactory } from 'dnd-core'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend, type TouchBackendOptions } from 'react-dnd-touch-backend'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import { useThemeStore } from './store/themeStore'
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

// 初始化主题系统
const initializeTheme = () => {
  if (typeof window !== 'undefined') {
    const { setTheme, theme } = useThemeStore.getState()
    setTheme(theme) // 这会应用保存的主题设置
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <DndProvider backend={backend} options={options}>
        <App />
      </DndProvider>
    </BrowserRouter>
  </React.StrictMode>
)

// 在应用启动后初始化主题
initializeTheme()

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


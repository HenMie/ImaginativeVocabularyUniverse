import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { DndProvider } from 'react-dnd'
import type { BackendFactory } from 'dnd-core'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { TouchBackend, type TouchBackendOptions } from 'react-dnd-touch-backend'
import { App } from './App'
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


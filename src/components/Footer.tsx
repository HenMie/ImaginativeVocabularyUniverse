
export const Footer = () => {
  return (
    <footer className="mt-auto py-6 lg:py-8 text-center border-t border-slate-200/50 dark:border-dark-border/50 bg-white/60 dark:bg-dark-surface/60 backdrop-blur-lg transition-smooth">
      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 3xl:px-20">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500 dark:text-dark-textMuted">
            Copyright © 2025 Chouann
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-dark-textMuted">
            <span className="flex items-center gap-1">
              <span>💡</span>
              <span>用心学习</span>
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1">
              <span>🚀</span>
              <span>持续进步</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
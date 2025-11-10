interface TutorialOverlayProps {
  open: boolean
  steps: string[]
  onClose: () => void
}

export const TutorialOverlay = ({ open, steps, onClose }: TutorialOverlayProps) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 backdrop-blur">
      <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-slate-800">快速上手</h2>
        <ol className="mt-4 space-y-3 text-sm text-slate-600">
          {steps.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary-dark"
        >
          开始挑战
        </button>
      </div>
    </div>
  )
}


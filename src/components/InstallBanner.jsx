import { useState } from 'react'
import { Download, X } from 'lucide-react'

export default function InstallBanner({ onInstall }) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('install-dismissed') === '1'
  )

  if (dismissed) return null

  function dismiss() {
    localStorage.setItem('install-dismissed', '1')
    setDismissed(true)
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 shadow-lg"
      style={{ background: 'linear-gradient(90deg, #14532d, #166534)' }}
    >
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-white/20 flex items-center justify-center">
        <img src="/icons/icon-192.png" alt="" className="w-8 h-8 object-contain" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm leading-tight">Install Plant Library</p>
        <p className="text-green-200 text-xs mt-0.5">Add to your home screen — works offline</p>
      </div>

      {/* Install button */}
      <button
        onClick={onInstall}
        className="flex-shrink-0 flex items-center gap-1.5 bg-white text-green-700 font-bold text-sm px-3 py-2 rounded-xl active:bg-green-50 transition-colors"
        style={{ minHeight: 40 }}
      >
        <Download size={15} />
        Install
      </button>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        className="flex-shrink-0 p-1.5 text-green-300 active:text-white"
        aria-label="Dismiss"
      >
        <X size={18} />
      </button>
    </div>
  )
}

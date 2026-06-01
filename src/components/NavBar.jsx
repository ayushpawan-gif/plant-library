import { Leaf, ScanSearch, PlusCircle, Settings } from 'lucide-react'

const tabs = [
  { hash: '#library', icon: Leaf, label: 'My Plants' },
  { hash: '#garden', icon: ScanSearch, label: 'Garden' },
  { hash: '#add', icon: PlusCircle, label: 'Add Plant' },
  { hash: '#settings', icon: Settings, label: 'Settings' },
]

export default function NavBar({ current }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-50 safe-bottom">
      {tabs.map(({ hash, icon: Icon, label }) => {
        const active = current === hash
        return (
          <a
            key={hash}
            href={hash}
            className={`flex flex-col items-center justify-center flex-1 py-3 gap-1 text-xs font-medium transition-colors ${
              active ? 'text-green-600' : 'text-gray-400'
            }`}
            style={{ minHeight: 64 }}
          >
            <Icon size={26} strokeWidth={active ? 2.5 : 1.8} />
            <span>{label}</span>
          </a>
        )
      })}
    </nav>
  )
}

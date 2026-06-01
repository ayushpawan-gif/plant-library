import { Camera } from 'lucide-react'
import HealthBadge from './HealthBadge'

function daysAgo(iso) {
  if (!iso) return null
  const diff = Math.floor((Date.now() - new Date(iso)) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff} days ago`
}

export default function PlantCard({ plant, latestSnapshot, interval, onUpdatePhoto, onClick }) {
  const daysSince = latestSnapshot
    ? Math.floor((Date.now() - new Date(latestSnapshot.date)) / 86400000)
    : null

  const intervalDays = interval === 'daily' ? 1 : 7
  const updateDue = daysSince == null || daysSince >= intervalDays

  return (
    <div
      className="bg-white rounded-2xl shadow-sm overflow-hidden active:scale-95 transition-transform cursor-pointer"
      onClick={onClick}
    >
      <div className="relative bg-gray-100 aspect-square">
        {latestSnapshot?.thumbnail ? (
          <img
            src={latestSnapshot.thumbnail}
            alt={plant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🌱</div>
        )}
        {updateDue && (
          <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            Update due
          </span>
        )}
      </div>

      <div className="p-3">
        <p className="font-semibold text-gray-900 text-lg leading-tight truncate">{plant.name}</p>
        <p className="text-sm text-gray-400 capitalize mb-2">{plant.category}</p>
        <div className="flex items-center justify-between gap-2">
          <HealthBadge score={latestSnapshot?.healthScore} />
          <button
            className="flex items-center gap-1 bg-green-600 text-white text-sm font-semibold px-3 py-2 rounded-xl active:bg-green-700 transition-colors"
            style={{ minHeight: 44 }}
            onClick={e => { e.stopPropagation(); onUpdatePhoto() }}
          >
            <Camera size={16} />
            Photo
          </button>
        </div>
        {latestSnapshot && (
          <p className="text-xs text-gray-400 mt-2">{daysAgo(latestSnapshot.date)}</p>
        )}
      </div>
    </div>
  )
}

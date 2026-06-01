import HealthBadge from './HealthBadge'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function Timeline({ snapshots }) {
  if (!snapshots || snapshots.length === 0) return (
    <p className="text-gray-400 text-center py-8">No progress photos yet.</p>
  )

  return (
    <div className="space-y-4">
      {snapshots.map((snap, i) => (
        <div key={snap.id} className="flex gap-4 items-start">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mt-1 flex-shrink-0" />
            {i < snapshots.length - 1 && <div className="w-0.5 bg-gray-200 flex-1 mt-1 min-h-[60px]" />}
          </div>
          <div className="flex-1 bg-white rounded-2xl overflow-hidden shadow-sm mb-2">
            {snap.thumbnail && (
              <img src={snap.thumbnail} alt="progress" className="w-full aspect-video object-cover" />
            )}
            <div className="p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-gray-500">{formatDate(snap.date)}</p>
                <HealthBadge score={snap.healthScore} />
              </div>
              {snap.aiNotes && <p className="text-gray-600 text-sm">{snap.aiNotes}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

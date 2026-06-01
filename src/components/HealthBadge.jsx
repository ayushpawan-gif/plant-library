export default function HealthBadge({ score }) {
  if (score == null) return null
  let color, label
  if (score >= 70) { color = 'bg-green-100 text-green-700'; label = 'Healthy' }
  else if (score >= 40) { color = 'bg-yellow-100 text-yellow-700'; label = 'Check needed' }
  else { color = 'bg-red-100 text-red-700'; label = 'Needs help' }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-medium ${color}`}>
      <span>{score >= 70 ? '🟢' : score >= 40 ? '🟡' : '🔴'}</span>
      {label}
    </span>
  )
}

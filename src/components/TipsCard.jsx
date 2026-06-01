export default function TipsCard({ tips }) {
  if (!tips || tips.length === 0) return null

  return (
    <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
      <h3 className="text-lg font-bold text-green-800 mb-3">💡 AI Tips for this week</h3>
      <ol className="space-y-3">
        {tips.map((tip, i) => (
          <li key={i} className="flex gap-3">
            <span className="flex-shrink-0 w-7 h-7 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
              {i + 1}
            </span>
            <p className="text-gray-700 text-base leading-snug">{tip}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

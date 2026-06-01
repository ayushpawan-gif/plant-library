// SVG health trend chart — no external library needed.
// Shows health scores across snapshots oldest→newest, with colour zones.

const W = 320
const H = 140
const PAD = { top: 16, right: 16, bottom: 28, left: 36 }
const INNER_W = W - PAD.left - PAD.right
const INNER_H = H - PAD.top - PAD.bottom

function scoreColour(s) {
  if (s >= 70) return '#16a34a'
  if (s >= 40) return '#ca8a04'
  return '#dc2626'
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function HealthChart({ snapshots }) {
  // snapshots come newest-first; reverse for the chart
  const ordered = [...snapshots].reverse().filter(s => s.healthScore != null)
  if (ordered.length < 2) return null

  const n = ordered.length
  const xs = ordered.map((_, i) => PAD.left + (i / (n - 1)) * INNER_W)
  const ys = ordered.map(s => PAD.top + INNER_H - (s.healthScore / 100) * INNER_H)

  // Polyline path
  const line = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ')

  // Fill area under line
  const fill = `${line} L${xs[n-1]},${PAD.top + INNER_H} L${xs[0]},${PAD.top + INNER_H} Z`

  // Y-axis grid lines at 0, 40, 70, 100
  const gridLines = [0, 40, 70, 100].map(v => ({
    y: PAD.top + INNER_H - (v / 100) * INNER_H,
    label: v,
    colour: v === 70 ? '#16a34a33' : v === 40 ? '#ca8a0433' : '#e5e7eb',
  }))

  // Latest trend indicator
  const latest = ordered[ordered.length - 1]
  const prev = ordered[ordered.length - 2]
  const delta = latest.healthScore - prev.healthScore
  const trendText = delta > 3 ? `▲ +${delta} improving` : delta < -3 ? `▼ ${delta} declining` : '→ stable'
  const trendColour = delta > 3 ? '#16a34a' : delta < -3 ? '#dc2626' : '#6b7280'

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 text-base">Health Over Time</h3>
        <span className="text-sm font-semibold" style={{ color: trendColour }}>{trendText}</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 140 }}>
        {/* Grid lines */}
        {gridLines.map(({ y, label, colour }) => (
          <g key={label}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke={colour} strokeWidth={1} />
            <text x={PAD.left - 4} y={y + 4} textAnchor="end"
              fontSize={9} fill="#9ca3af">{label}</text>
          </g>
        ))}

        {/* Fill */}
        <path d={fill} fill="#16a34a" opacity={0.08} />

        {/* Line */}
        <path d={line} fill="none" stroke="#16a34a" strokeWidth={2.5}
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots */}
        {ordered.map((s, i) => (
          <circle key={s.id} cx={xs[i]} cy={ys[i]} r={5}
            fill={scoreColour(s.healthScore)} stroke="white" strokeWidth={2} />
        ))}

        {/* Solution-applied markers (vertical dashed lines) */}
        {ordered.map((s, i) =>
          s.solutions?.some(sol => sol.applied) ? (
            <line key={`sol-${s.id}`}
              x1={xs[i]} y1={PAD.top} x2={xs[i]} y2={PAD.top + INNER_H}
              stroke="#16a34a" strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
          ) : null
        )}

        {/* X-axis labels (first, last, and any solution-applied) */}
        {[0, n - 1].map(i => (
          <text key={i} x={xs[i]} y={H - 4} textAnchor="middle"
            fontSize={9} fill="#9ca3af">
            {formatDate(ordered[i].date)}
          </text>
        ))}
      </svg>

      <div className="flex gap-4 mt-2 text-xs text-gray-400">
        <span className="flex items-center gap-1"><span style={{color:'#16a34a'}}>●</span> Healthy (70+)</span>
        <span className="flex items-center gap-1"><span style={{color:'#ca8a04'}}>●</span> Check (40–70)</span>
        <span className="flex items-center gap-1"><span style={{color:'#dc2626'}}>●</span> Urgent (&lt;40)</span>
        <span className="flex items-center gap-1"><span style={{color:'#16a34a'}}>╎</span> Fix applied</span>
      </div>
    </div>
  )
}

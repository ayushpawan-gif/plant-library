import { useState } from 'react'
import { CheckCircle2, Circle, ChevronDown, ChevronUp, AlertTriangle, ShieldCheck } from 'lucide-react'
import { markSolutionApplied } from '../db'

const SEVERITY_STYLE = {
  critical: { bg: 'bg-red-100',    text: 'text-red-800',    bar: 'bg-red-500',    label: '🚨 Critical' },
  high:     { bg: 'bg-orange-100', text: 'text-orange-800', bar: 'bg-orange-500', label: '⚠️ High' },
  medium:   { bg: 'bg-yellow-100', text: 'text-yellow-800', bar: 'bg-yellow-500', label: '⚡ Medium' },
  low:      { bg: 'bg-blue-100',   text: 'text-blue-700',   bar: 'bg-blue-400',   label: 'ℹ️ Low' },
}

const PRIORITY_STYLE = {
  urgent: { dot: 'bg-red-500',    label: 'Urgent' },
  high:   { dot: 'bg-orange-500', label: 'High' },
  medium: { dot: 'bg-yellow-500', label: 'Medium' },
  low:    { dot: 'bg-gray-400',   label: 'Low' },
}

function ConfidenceBar({ value, colour = '#16a34a' }) {
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className="h-2 rounded-full transition-all" style={{ width: `${value}%`, background: colour }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{value}%</span>
    </div>
  )
}

// Identification confidence section (top of each snapshot)
export function IdentificationConfidence({ plant }) {
  if (!plant?.confidenceScore) return null
  const score = plant.confidenceScore
  const colour = score >= 80 ? '#16a34a' : score >= 50 ? '#ca8a04' : '#dc2626'
  const label = score >= 80 ? 'High confidence' : score >= 50 ? 'Moderate confidence' : 'Low confidence'

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      <h3 className="font-bold text-gray-900 text-base mb-3">Plant Identification</h3>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-800">{plant.name}</span>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: colour + '20', color: colour }}>{label}</span>
          </div>
          {plant.species && <p className="text-gray-400 text-sm italic">{plant.species}</p>}
          <ConfidenceBar value={score} colour={colour} />
        </div>

        {plant.alternatives?.filter(a => a.score > 0).map((alt, i) => (
          <div key={i} className="opacity-60">
            <div className="flex justify-between">
              <span className="text-gray-600 text-sm">{alt.name}</span>
              <span className="text-xs text-gray-400">{alt.score}%</span>
            </div>
            <ConfidenceBar value={alt.score} colour="#9ca3af" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Main diagnosis + problems + solutions for a snapshot
export default function DiagnosisCard({ snapshot, onSolutionToggle }) {
  const [expanded, setExpanded] = useState(true)
  if (!snapshot) return null

  const { diagnosis, assessmentConfidence, problems = [], solutions = [] } = snapshot
  if (!diagnosis && problems.length === 0) return null

  const hasProblems = problems.length > 0
  const allSolved = solutions.length > 0 && solutions.every(s => s.applied)

  return (
    <div className={`rounded-2xl shadow-sm overflow-hidden ${hasProblems ? 'border border-orange-200' : 'border border-green-200'}`}>
      {/* Header */}
      <button
        className={`w-full flex items-start gap-3 p-4 text-left ${hasProblems ? 'bg-orange-50' : 'bg-green-50'}`}
        onClick={() => setExpanded(v => !v)}
      >
        {hasProblems
          ? <AlertTriangle className="text-orange-500 flex-shrink-0 mt-0.5" size={22} />
          : <ShieldCheck className="text-green-600 flex-shrink-0 mt-0.5" size={22} />
        }
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-base ${hasProblems ? 'text-orange-800' : 'text-green-800'}`}>
            {hasProblems ? 'Health issues detected' : 'Plant looks healthy'}
          </p>
          {diagnosis && <p className="text-gray-600 text-sm mt-0.5 leading-snug">{diagnosis}</p>}
          {assessmentConfidence != null && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500">Assessment confidence</span>
              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                <div className="h-1.5 rounded-full bg-gray-500"
                  style={{ width: `${assessmentConfidence}%` }} />
              </div>
              <span className="text-xs text-gray-500">{assessmentConfidence}%</span>
            </div>
          )}
        </div>
        {expanded ? <ChevronUp size={18} className="text-gray-400 flex-shrink-0" />
                  : <ChevronDown size={18} className="text-gray-400 flex-shrink-0" />}
      </button>

      {expanded && (
        <div className="bg-white px-4 pb-4 pt-3 space-y-5">

          {/* Problems — confidence bars */}
          {problems.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Problems Found</h4>
              <div className="space-y-3">
                {problems.map((p, i) => {
                  const sev = SEVERITY_STYLE[p.severity] || SEVERITY_STYLE.medium
                  return (
                    <div key={i} className={`rounded-xl p-3 ${sev.bg}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-semibold text-sm ${sev.text}`}>{p.issue}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sev.bg} ${sev.text}`}>
                          {sev.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Confidence</span>
                        <div className="flex-1 bg-white/60 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${sev.bar}`}
                            style={{ width: `${p.confidence}%` }} />
                        </div>
                        <span className="text-xs text-gray-600 font-medium">{p.confidence}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Solutions — checkable */}
          {solutions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                  Recommended Actions
                </h4>
                {allSolved && (
                  <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">
                    All done ✓
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {solutions.map((sol, i) => {
                  const pri = PRIORITY_STYLE[sol.priority] || PRIORITY_STYLE.medium
                  return (
                    <button
                      key={i}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-colors ${
                        sol.applied ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-100'
                      }`}
                      onClick={() => onSolutionToggle?.(i, !sol.applied)}
                    >
                      {sol.applied
                        ? <CheckCircle2 className="text-green-600 flex-shrink-0 mt-0.5" size={22} />
                        : <Circle className="text-gray-300 flex-shrink-0 mt-0.5" size={22} />
                      }
                      <div className="flex-1 min-w-0">
                        <p className={`text-base leading-snug ${sol.applied ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                          {sol.action}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${pri.dot}`} />
                          <span className="text-xs text-gray-400">{pri.label} priority</span>
                          {sol.applied && sol.appliedDate && (
                            <span className="text-xs text-green-500 ml-1">
                              · Done {new Date(sol.appliedDate).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

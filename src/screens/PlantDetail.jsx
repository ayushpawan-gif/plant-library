import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Camera, Trash2, RefreshCw } from 'lucide-react'
import { getPlant, getSnapshots, addSnapshot, getTips, saveTips, getSetting, deletePlant, markSolutionApplied } from '../db'
import { compressToThumbnail } from '../imageUtils'
import { analyzeHealth, refreshTips as aiRefreshTips } from '../ai'
import HealthBadge from '../components/HealthBadge'
import HealthChart from '../components/HealthChart'
import DiagnosisCard, { IdentificationConfidence } from '../components/DiagnosisCard'
import TipsCard from '../components/TipsCard'
import Timeline from '../components/Timeline'

export default function PlantDetail({ plantId, onBack }) {
  const [plant, setPlant] = useState(null)
  const [snapshots, setSnapshots] = useState([])
  const [tips, setTips] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [refreshingTips, setRefreshingTips] = useState(false)
  const fileRef = useRef()

  useEffect(() => { load() }, [plantId])

  async function load() {
    setLoading(true)
    const [p, snaps, savedTips] = await Promise.all([
      getPlant(plantId),
      getSnapshots(plantId),
      getTips(plantId)
    ])
    setPlant(p)
    setSnapshots(snaps)
    if (savedTips?.tips) setTips(savedTips.tips)
    setLoading(false)
  }

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const thumbnail = await compressToThumbnail(file)
      const apiKey = await getSetting('apiKey')
      let healthScore = null
      let assessmentConfidence = null
      let diagnosis = ''
      let problems = []
      let solutions = []
      let newTips = tips

      if (apiKey) {
        try {
          const result = await analyzeHealth(apiKey, plant.name, plant.species, thumbnail)
          healthScore = result.healthScore
          assessmentConfidence = result.assessmentConfidence
          diagnosis = result.diagnosis || ''
          problems = result.problems || []
          solutions = (result.solutions || []).map(s => ({ ...s, applied: false, appliedDate: null }))
          newTips = result.solutions?.map(s => s.action) || tips
        } catch (_) {}
      }

      await addSnapshot({ plantId, thumbnail, healthScore, assessmentConfidence, diagnosis, problems, solutions, aiNotes: diagnosis, tips: newTips })
      if (newTips.length > 0) await saveTips(plantId, newTips)
      await load()
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleRefreshTips() {
    const apiKey = await getSetting('apiKey')
    if (!apiKey || snapshots.length === 0) return
    setRefreshingTips(true)
    try {
      const latest = snapshots[0]
      const newTips = await aiRefreshTips(apiKey, plant.name, latest.thumbnail)
      if (newTips.length > 0) {
        await saveTips(plantId, newTips)
        setTips(newTips)
      }
    } catch (_) {
    } finally {
      setRefreshingTips(false)
    }
  }

  async function handleSolutionToggle(snapshotId, solutionIndex, applied) {
    await markSolutionApplied(snapshotId, solutionIndex, applied)
    await load()
  }

  async function handleDelete() {
    if (!window.confirm(`Delete ${plant.name}? This cannot be undone.`)) return
    await deletePlant(plantId)
    onBack()
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-green-600 text-lg">Loading...</p>
    </div>
  )

  if (!plant) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-gray-600 text-lg">Plant not found.</p>
      <button onClick={onBack} className="text-green-600 font-semibold text-lg">Go back</button>
    </div>
  )

  const latest = snapshots[0]
  const hasAI = latest?.diagnosis || (latest?.problems?.length > 0)

  // Health improvement summary
  const scored = snapshots.filter(s => s.healthScore != null)
  const firstScore = scored.length > 1 ? scored[scored.length - 1].healthScore : null
  const latestScore = scored.length > 0 ? scored[0].healthScore : null
  const improvement = firstScore != null && latestScore != null ? latestScore - firstScore : null

  return (
    <div className="pb-28">
      {/* Sticky header */}
      <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={onBack} className="p-2 -ml-2 active:bg-gray-100 rounded-xl">
            <ArrowLeft size={26} className="text-gray-700" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{plant.name}</h1>
            <p className="text-sm text-gray-400 italic capitalize">{plant.species || plant.category}</p>
          </div>
          <button onClick={handleDelete} className="p-2 active:bg-red-50 rounded-xl">
            <Trash2 size={22} className="text-red-400" />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* Latest photo */}
        {latest?.thumbnail && (
          <div className="relative rounded-2xl overflow-hidden shadow">
            <img src={latest.thumbnail} alt={plant.name} className="w-full aspect-video object-cover" />
            {latest.healthScore != null && (
              <div className="absolute bottom-3 left-3">
                <HealthBadge score={latest.healthScore} />
              </div>
            )}
            {latest.assessmentConfidence != null && (
              <div className="absolute bottom-3 right-3 bg-black/50 rounded-lg px-2 py-1">
                <p className="text-white text-xs font-medium">
                  AI certainty: {latest.assessmentConfidence}%
                </p>
              </div>
            )}
          </div>
        )}

        {/* Improvement summary banner */}
        {improvement != null && Math.abs(improvement) >= 5 && (
          <div className={`rounded-2xl px-4 py-3 flex items-center gap-3 ${
            improvement > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <span className="text-2xl">{improvement > 0 ? '📈' : '📉'}</span>
            <div>
              <p className={`font-bold ${improvement > 0 ? 'text-green-800' : 'text-red-800'}`}>
                Health {improvement > 0 ? 'improved' : 'declined'} by {Math.abs(improvement)} points
              </p>
              <p className="text-sm text-gray-500">
                {firstScore} → {latestScore} over {scored.length} check{scored.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        {/* Take progress photo button */}
        <button
          className="w-full bg-green-600 text-white text-xl font-bold py-5 rounded-2xl flex items-center justify-center gap-3 active:bg-green-700 transition-colors shadow"
          onClick={() => fileRef.current.click()}
        >
          <Camera size={26} /> Take Progress Photo
        </button>

        {/* Identification confidence (confusion matrix) */}
        <IdentificationConfidence plant={plant} />

        {/* Care summary */}
        {plant.careSummary && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
            <p className="text-blue-800 text-base leading-snug">{plant.careSummary}</p>
          </div>
        )}

        {/* Latest diagnosis: problems + solutions */}
        {latest && (
          <DiagnosisCard
            snapshot={latest}
            onSolutionToggle={(solutionIndex, applied) =>
              handleSolutionToggle(latest.id, solutionIndex, applied)
            }
          />
        )}

        {/* Health trend chart */}
        <HealthChart snapshots={snapshots} />

        {/* Care tips */}
        {tips.length > 0 && (
          <div>
            <TipsCard tips={tips} />
            <button
              className="mt-2 w-full text-green-700 text-sm font-medium flex items-center justify-center gap-2 py-2"
              onClick={handleRefreshTips}
              disabled={refreshingTips}
            >
              <RefreshCw size={16} className={refreshingTips ? 'animate-spin' : ''} />
              {refreshingTips ? 'Getting fresh tips...' : 'Refresh tips'}
            </button>
          </div>
        )}

        {/* Photo timeline */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Photo History ({snapshots.length})
          </h2>
          <Timeline snapshots={snapshots} />
        </div>
      </div>

      {/* Uploading overlay */}
      {uploading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center mx-6 shadow-xl">
            <div className="text-5xl mb-3">🔬</div>
            <p className="text-lg font-semibold text-gray-800">Analysing plant health...</p>
            <p className="text-gray-400 mt-1">Checking for problems and generating care plan</p>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        className="hidden" onChange={handleFile} />
    </div>
  )
}

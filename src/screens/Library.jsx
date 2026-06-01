import { useState, useEffect, useRef } from 'react'
import PlantCard from '../components/PlantCard'
import { getPlants, getLatestSnapshot, getSetting, addSnapshot } from '../db'
import { compressToThumbnail } from '../imageUtils'
import { analyzeHealth } from '../ai'

function SpiritualBanner() {
  return (
    <div
      className="relative overflow-hidden rounded-3xl mb-6"
      style={{
        background: 'linear-gradient(135deg, #052e16 0%, #14532d 50%, #166534 100%)',
        minHeight: 180,
      }}
    >
      {/* Mandala / lotus SVG watermark */}
      <svg
        viewBox="0 0 200 200"
        className="absolute right-0 top-0 opacity-10"
        style={{ width: 180, height: 180 }}
        aria-hidden="true"
      >
        {/* Outer petals */}
        {Array.from({ length: 8 }).map((_, i) => (
          <ellipse
            key={i}
            cx="100" cy="100" rx="16" ry="44"
            fill="#bbf7d0"
            transform={`rotate(${i * 45} 100 100)`}
          />
        ))}
        {/* Middle petals */}
        {Array.from({ length: 8 }).map((_, i) => (
          <ellipse
            key={i + 8}
            cx="100" cy="100" rx="10" ry="30"
            fill="#86efac"
            transform={`rotate(${i * 45 + 22.5} 100 100)`}
          />
        ))}
        {/* Centre circle */}
        <circle cx="100" cy="100" r="14" fill="#4ade80" />
        <circle cx="100" cy="100" r="7" fill="#bbf7d0" />
      </svg>

      <div className="relative z-10 px-5 py-5">
        {/* Om symbol */}
        <div
          className="text-4xl mb-3 leading-none"
          style={{ fontFamily: 'serif', color: '#bbf7d0', opacity: 0.9 }}
        >
          ॐ
        </div>
        <h1 className="text-white text-2xl font-bold leading-tight mb-1">
          My Plant Garden
        </h1>
        <p className="text-green-200 text-base leading-snug">
          "In every leaf, in every root — the divine breathes."
        </p>
        <p className="text-green-400 text-sm mt-2 italic">
          — Nature is God's living temple
        </p>
      </div>
    </div>
  )
}

export default function Library() {
  const [plants, setPlants] = useState([])
  const [snapshots, setSnapshots] = useState({})
  const [interval, setIntervalPref] = useState('weekly')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(null)
  const fileRef = useRef()
  const uploadingPlantId = useRef(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const [ps, iv] = await Promise.all([getPlants(), getSetting('interval')])
    setIntervalPref(iv || 'weekly')
    const snaps = {}
    await Promise.all(ps.map(async p => {
      snaps[p.id] = await getLatestSnapshot(p.id)
    }))
    setPlants(ps)
    setSnapshots(snaps)
    setLoading(false)
  }

  async function handleUpdatePhoto(plantId) {
    uploadingPlantId.current = plantId
    fileRef.current.click()
  }

  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const plantId = uploadingPlantId.current
    setUploading(plantId)
    try {
      const thumbnail = await compressToThumbnail(file)
      const apiKey = await getSetting('apiKey')
      let healthScore = null
      let aiNotes = ''
      let tips = []

      let assessmentConfidence = null
      let diagnosis = ''
      let problems = []
      let solutions = []

      if (apiKey) {
        const plant = plants.find(p => p.id === plantId)
        try {
          const result = await analyzeHealth(apiKey, plant.name, plant.species, thumbnail)
          healthScore = result.healthScore
          assessmentConfidence = result.assessmentConfidence
          diagnosis = result.diagnosis || ''
          problems = result.problems || []
          solutions = (result.solutions || []).map(s => ({ ...s, applied: false, appliedDate: null }))
          aiNotes = diagnosis
          tips = solutions.map(s => s.action)
        } catch (_) {}
      }

      await addSnapshot({ plantId, thumbnail, healthScore, assessmentConfidence, diagnosis, problems, solutions, aiNotes, tips })
      const newSnap = await getLatestSnapshot(plantId)
      setSnapshots(prev => ({ ...prev, [plantId]: newSnap }))
    } finally {
      setUploading(null)
      e.target.value = ''
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-green-600 text-xl">🪷 Loading your garden...</div>
    </div>
  )

  return (
    <div className="p-4 pt-4">
      <SpiritualBanner />

      {plants.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-10 gap-4 text-center px-8">
          <div className="text-7xl">🪷</div>
          <h2 className="text-2xl font-semibold text-gray-700">Your garden awaits</h2>
          <p className="text-gray-400 text-lg">
            Each plant you add becomes part of your living temple.
          </p>
          <p className="text-gray-300 text-base italic">
            Tap <strong className="text-green-600">Add Plant</strong> below to begin
          </p>
          <a
            href="#add"
            className="mt-4 bg-green-700 text-white text-lg font-semibold px-8 py-4 rounded-2xl active:bg-green-800 transition-colors shadow"
          >
            🌱 Add My First Plant
          </a>
        </div>
      ) : (
        <>
          <p className="text-gray-400 text-sm mb-4 text-right">{plants.length} plant{plants.length !== 1 ? 's' : ''} in your garden</p>
          <div className="grid grid-cols-2 gap-4">
            {plants.map(plant => (
              <PlantCard
                key={plant.id}
                plant={plant}
                latestSnapshot={snapshots[plant.id]}
                interval={interval}
                onUpdatePhoto={() => handleUpdatePhoto(plant.id)}
                onClick={() => (window.location.hash = `#plant/${plant.id}`)}
              />
            ))}
          </div>
        </>
      )}

      {uploading && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center mx-6 shadow-xl">
            <div className="text-5xl mb-3">🪷</div>
            <p className="text-lg font-semibold text-gray-800">Blessing your plant...</p>
            <p className="text-gray-400 mt-1">AI is analysing its health</p>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

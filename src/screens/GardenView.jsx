import { useState, useEffect, useRef } from 'react'
import { Camera, X, Check, Trash2, RefreshCw, Info, ScanSearch } from 'lucide-react'
import { getGarden, saveGarden, saveGardenPins, getPlants, getLatestSnapshot, addPlant, addSnapshot, getSetting } from '../db'
import { compressToThumbnail } from '../imageUtils'
import { detectGardenPlants } from '../ai'

const CATEGORY_COLOUR = {
  vegetable: '#16a34a', herb: '#059669', flower: '#db2777',
  succulent: '#d97706', fruit: '#dc2626', tree: '#92400e', other: '#6b7280',
}

function categoryEmoji(cat) {
  const map = { vegetable:'🥬', herb:'🌿', flower:'🌸', succulent:'🌵', fruit:'🍎', tree:'🌳', other:'🌱' }
  return map[cat] || '🌱'
}

// ── Pin marker on the photo ──
function Pin({ pin, plant, snapshot, selected, onTap, onRemove }) {
  const colour = CATEGORY_COLOUR[plant?.category] || '#16a34a'
  return (
    <div style={{
      position: 'absolute',
      left: `${pin.x * 100}%`,
      top: `${pin.y * 100}%`,
      transform: 'translate(-50%, -100%)',
      zIndex: selected ? 30 : 20,
    }}>
      {selected && (
        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl border border-gray-100 flex items-center gap-2 px-3 py-2 whitespace-nowrap" style={{ minWidth: 170 }}>
          {snapshot?.thumbnail
            ? <img src={snapshot.thumbnail} className="w-10 h-10 object-cover rounded-xl flex-shrink-0" alt="" />
            : <span className="text-2xl">{categoryEmoji(plant?.category)}</span>}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm truncate">{plant?.name}</p>
            <p className="text-gray-400 text-xs capitalize">{plant?.category}</p>
          </div>
          <button className="p-1.5 text-green-600 bg-green-50 rounded-lg font-bold text-xs"
            onClick={e => { e.stopPropagation(); window.location.hash = `#plant/${plant?.id}` }}>
            View
          </button>
          <button className="p-1.5 text-red-400" onClick={e => { e.stopPropagation(); onRemove(pin.id) }}>
            <Trash2 size={14} />
          </button>
        </div>
      )}
      <button
        onClick={e => { e.stopPropagation(); onTap(pin.id) }}
        style={{
          width: 36, height: 36,
          borderRadius: '50% 50% 50% 0',
          transform: 'rotate(-45deg)',
          background: colour,
          border: selected ? '3px solid white' : '2px solid white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <span style={{ transform: 'rotate(45deg)', fontSize: 15, lineHeight: 1 }}>
          {categoryEmoji(plant?.category)}
        </span>
      </button>
    </div>
  )
}

// ── Manual plant selector (fallback) ──
function PlantSelector({ plants, snapshots, onSelect, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={onCancel}>
      <div className="bg-white w-full rounded-t-3xl pt-5 pb-10 max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 mb-4">
          <h2 className="text-xl font-bold text-gray-900">Which plant is here?</h2>
          <button onClick={onCancel} className="p-2 text-gray-400"><X size={24} /></button>
        </div>
        <div className="overflow-y-auto px-5 space-y-2">
          {plants.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Add plants from the My Plants tab first.</p>
          ) : plants.map(plant => (
            <button key={plant.id}
              className="w-full flex items-center gap-4 bg-gray-50 rounded-2xl px-4 py-3 active:bg-green-50 transition-colors"
              style={{ minHeight: 64 }}
              onClick={() => onSelect(plant.id)}
            >
              {snapshots[plant.id]?.thumbnail
                ? <img src={snapshots[plant.id].thumbnail} className="w-12 h-12 object-cover rounded-xl flex-shrink-0" alt="" />
                : <span className="text-3xl">{categoryEmoji(plant.category)}</span>}
              <div className="flex-1 text-left">
                <p className="font-semibold text-gray-900 text-lg">{plant.name}</p>
                <p className="text-gray-400 text-sm capitalize">{plant.category}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Scan result overlay ──
function ScanResult({ results, onDone }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl pt-6 pb-10 max-h-[80vh] flex flex-col">
        <div className="px-5 mb-4 text-center">
          <div className="text-4xl mb-2">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900">
            {results.length} plant{results.length !== 1 ? 's' : ''} found!
          </h2>
          <p className="text-gray-400 mt-1">All added to your library and pinned on the map</p>
        </div>
        <div className="overflow-y-auto px-5 space-y-2 mb-5">
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-3 bg-green-50 rounded-2xl px-4 py-3">
              <span className="text-2xl">{categoryEmoji(r.category)}</span>
              <div>
                <p className="font-semibold text-gray-900">{r.name}</p>
                {r.species && <p className="text-gray-400 text-sm">{r.species}</p>}
              </div>
              <span className="ml-auto text-green-600 font-bold text-sm">Added ✓</span>
            </div>
          ))}
        </div>
        <div className="px-5">
          <button className="w-full bg-green-600 text-white text-xl font-bold py-4 rounded-2xl active:bg-green-700"
            onClick={onDone}>
            View Garden Map
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main screen ──
export default function GardenView() {
  const [garden, setGarden] = useState(null)
  const [plants, setPlants] = useState([])
  const [snapshots, setSnapshots] = useState({})
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanResults, setScanResults] = useState(null)
  const [scanError, setScanError] = useState(null)
  const [pinMode, setPinMode] = useState(false)
  const [pendingPos, setPendingPos] = useState(null)
  const [selectedPinId, setSelectedPinId] = useState(null)
  const [showSelector, setShowSelector] = useState(false)
  const fileRef = useRef()
  const imgRef = useRef()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [g, ps] = await Promise.all([getGarden(), getPlants()])
    const snaps = {}
    await Promise.all(ps.map(async p => { snaps[p.id] = await getLatestSnapshot(p.id) }))
    setGarden(g)
    setPlants(ps)
    setSnapshots(snaps)
    setLoading(false)
  }

  async function handlePhotoFile(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setScanError(null)

    const thumbnail = await compressToThumbnail(file)
    const existingPins = garden?.pins || []
    await saveGarden(thumbnail, existingPins)
    setGarden(prev => ({ ...(prev || {}), thumbnail, pins: existingPins }))

    // Auto-scan for plants (server key handles auth even if local key is null)
    const apiKey = await getSetting('apiKey')
    setScanning(true)
    try {
      const detected = await detectGardenPlants(apiKey, thumbnail)
      if (detected.length === 0) {
        setScanError('No plants detected automatically. Tap 📍 to mark plants manually.')
        await load()
        return
      }

      // For each detected plant: find or create in library, then add a pin
      const currentPlants = await getPlants()
      const added = []
      const newPins = [...existingPins]

      for (const det of detected) {
        // Check if plant with same name already exists (case-insensitive)
        const existing = currentPlants.find(
          p => p.name.toLowerCase() === det.name.toLowerCase()
        )

        let plantId
        if (existing) {
          plantId = existing.id
        } else {
          const newPlant = await addPlant({
            name: det.name,
            species: det.species || '',
            category: det.category || 'other',
            careSummary: det.careSummary || '',
          })
          // Add the garden thumbnail as the first snapshot
          await addSnapshot({ plantId: newPlant.id, thumbnail, healthScore: null, aiNotes: '', tips: [] })
          plantId = newPlant.id
          added.push(det)
        }

        // Add pin (skip if this plant already has a pin)
        const alreadyPinned = newPins.some(p => p.plantId === plantId)
        if (!alreadyPinned) {
          newPins.push({ id: Date.now().toString() + Math.random(), x: det.x, y: det.y, plantId })
        }
      }

      await saveGardenPins(newPins)
      setScanResults(added.length > 0 ? detected : null)
      if (added.length === 0) {
        setScanError(`${detected.length} plant${detected.length !== 1 ? 's' : ''} recognised and pinned on the map.`)
      }
      await load()
    } catch (err) {
      setScanError('Could not scan for plants. You can pin them manually.')
      await load()
    } finally {
      setScanning(false)
    }
  }

  function handleImageTap(e) {
    if (!pinMode) { setSelectedPinId(null); return }
    const rect = imgRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setPendingPos({ x, y })
    setShowSelector(true)
  }

  async function handlePlantSelected(plantId) {
    if (!pendingPos) return
    const newPin = { id: Date.now().toString(), x: pendingPos.x, y: pendingPos.y, plantId }
    const pins = [...(garden?.pins || []), newPin]
    await saveGardenPins(pins)
    setGarden(prev => ({ ...prev, pins }))
    setPendingPos(null)
    setShowSelector(false)
    setPinMode(false)
  }

  async function handleRemovePin(pinId) {
    const pins = (garden?.pins || []).filter(p => p.id !== pinId)
    await saveGardenPins(pins)
    setGarden(prev => ({ ...prev, pins }))
    setSelectedPinId(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-green-600 text-xl">🏡 Loading your garden...</p>
    </div>
  )

  // No photo yet
  if (!garden?.thumbnail) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-8">
      <div className="text-8xl">🏡</div>
      <h1 className="text-3xl font-bold text-gray-900 text-center">Garden Map</h1>
      <p className="text-gray-500 text-xl text-center leading-snug">
        Take a photo of your garden or shelf — AI will automatically find and label every plant.
      </p>
      <button
        className="w-full bg-green-700 text-white text-xl font-bold py-5 rounded-2xl flex items-center justify-center gap-3 active:bg-green-800 shadow"
        onClick={() => fileRef.current.click()}
      >
        <Camera size={28} /> Photograph My Garden
      </button>
      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        className="hidden" onChange={handlePhotoFile} />
    </div>
  )

  const pins = garden.pins || []

  return (
    <div className="flex flex-col min-h-screen bg-gray-900">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900">
        <div>
          <h1 className="text-white text-xl font-bold">Garden Map</h1>
          <p className="text-gray-400 text-sm">{pins.length} plant{pins.length !== 1 ? 's' : ''} marked</p>
        </div>
        <div className="flex gap-2">
          <button
            className={`px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 ${
              pinMode ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-200'
            }`}
            style={{ minHeight: 44 }}
            onClick={() => { setPinMode(v => !v); setSelectedPinId(null) }}
          >
            {pinMode ? <><Check size={15} /> Tap photo</> : '📍 Manual'}
          </button>
          <button
            className="bg-gray-700 text-gray-200 px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5"
            style={{ minHeight: 44 }}
            onClick={() => fileRef.current.click()}
          >
            <Camera size={16} /> Rescan
          </button>
        </div>
      </div>

      {pinMode && (
        <div className="bg-green-700 text-white text-center py-2 px-4 text-sm flex items-center justify-center gap-2">
          <Info size={14} /> Tap on the photo where a plant is
        </div>
      )}

      {scanError && (
        <div className="bg-blue-700 text-white text-center py-2 px-4 text-sm flex items-center justify-center gap-2">
          <Info size={14} /> {scanError}
          <button onClick={() => setScanError(null)} className="ml-2"><X size={14} /></button>
        </div>
      )}

      {/* Photo + pins */}
      <div
        className="relative flex-1 overflow-hidden"
        style={{ cursor: pinMode ? 'crosshair' : 'default' }}
        onClick={handleImageTap}
      >
        <img ref={imgRef} src={garden.thumbnail} alt="Garden"
          className="w-full h-full object-contain block" draggable={false}
          style={{ userSelect: 'none' }} />

        {pins.map(pin => {
          const plant = plants.find(p => p.id === pin.plantId)
          return (
            <Pin key={pin.id} pin={pin} plant={plant} snapshot={snapshots[pin.plantId]}
              selected={selectedPinId === pin.id}
              onTap={id => { setSelectedPinId(prev => prev === id ? null : id); setPinMode(false) }}
              onRemove={handleRemovePin}
            />
          )
        })}

        {pins.length === 0 && !scanning && (
          <div className="absolute inset-0 flex items-end justify-center pb-32 pointer-events-none">
            <div className="bg-black/60 text-white rounded-2xl px-6 py-4 text-center mx-8">
              <p className="font-semibold text-lg">No plants marked yet</p>
              <p className="text-gray-300 text-sm mt-1">
                Tap <strong>Rescan</strong> to let AI find plants, or <strong>Manual</strong> to add manually
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Scanning overlay */}
      {scanning && (
        <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-50 gap-5">
          <ScanSearch className="text-green-400 animate-pulse" size={60} />
          <p className="text-white text-2xl font-bold text-center">Scanning for plants...</p>
          <p className="text-green-300 text-lg text-center px-8">
            AI is identifying every plant in your photo
          </p>
        </div>
      )}

      {/* Scan results */}
      {scanResults && (
        <ScanResult results={scanResults} onDone={() => setScanResults(null)} />
      )}

      {/* Manual plant selector */}
      {showSelector && (
        <PlantSelector plants={plants} snapshots={snapshots}
          onSelect={handlePlantSelected}
          onCancel={() => { setShowSelector(false); setPendingPos(null) }} />
      )}

      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        className="hidden" onChange={handlePhotoFile} />
    </div>
  )
}

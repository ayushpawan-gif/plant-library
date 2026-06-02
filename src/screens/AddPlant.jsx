import { useState, useRef, useEffect } from 'react'
import { Camera, CheckCircle, XCircle, Loader, Edit2 } from 'lucide-react'
import { addPlant, addSnapshot, getSetting } from '../db'
import { compressToThumbnail } from '../imageUtils'
import { identifyPlant } from '../ai'

const CATEGORIES = ['vegetable', 'herb', 'flower', 'succulent', 'fruit', 'tree', 'other']

function categoryEmoji(cat) {
  const map = { vegetable:'🥬', herb:'🌿', flower:'🌸', succulent:'🌵', fruit:'🍎', tree:'🌳', other:'🌱' }
  return map[cat] || '🌱'
}

export default function AddPlant({ onDone }) {
  const [step, setStep] = useState('capture') // capture | scanning | success | edit | saving
  const [thumbnail, setThumbnail] = useState(null)
  const [identified, setIdentified] = useState(null)
  const [editName, setEditName] = useState('')
  const [editCategory, setEditCategory] = useState('other')
  const [error, setError] = useState(null)
  const [countdown, setCountdown] = useState(3)
  const fileRef = useRef()
  const timerRef = useRef()

  // Auto-save countdown when we reach 'success' step
  useEffect(() => {
    if (step !== 'success') return
    setCountdown(3)
    let n = 3
    timerRef.current = setInterval(() => {
      n -= 1
      setCountdown(n)
      if (n <= 0) {
        clearInterval(timerRef.current)
        doSave(identified)
      }
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [step])

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setError(null)
    setStep('scanning')

    const thumb = await compressToThumbnail(file)
    setThumbnail(thumb)

    const apiKey = await getSetting('apiKey') // may be null — server key handles it

    try {
      const result = await identifyPlant(apiKey, thumb)
      setIdentified(result)

      if (result.confidence === 'high' && result.name && result.name !== 'Unknown Plant') {
        // High confidence — show auto-save countdown
        setStep('success')
      } else {
        // Low confidence — let user correct
        setEditName(result.name || '')
        setEditCategory(result.category || 'other')
        setStep('edit')
      }
    } catch (err) {
      setIdentified(null)
      setEditName('')
      setEditCategory('other')
      setError(err.message?.includes('No API key')
        ? 'No AI key found. Add a Gemini key in Settings ⚙️'
        : 'Could not identify plant — please type the name below.')
      setStep('edit')
    }
  }

  async function doSave(plant) {
    setStep('saving')
    const saved = await addPlant({
      name: plant.name,
      species: plant.species || '',
      category: plant.category || 'other',
      careSummary: plant.careSummary || '',
      confidenceScore: plant.confidenceScore ?? null,
      alternatives: plant.alternatives ?? [],
    })
    await addSnapshot({ plantId: saved.id, thumbnail, healthScore: null, aiNotes: '', tips: [], problems: [], solutions: [] })
    onDone()
  }

  function cancelCountdown() {
    clearInterval(timerRef.current)
    setEditName(identified?.name || '')
    setEditCategory(identified?.category || 'other')
    setStep('edit')
  }

  // ── Capture screen ──
  if (step === 'capture') return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-8">
      <div className="text-7xl">📷</div>
      <h1 className="text-3xl font-bold text-gray-900 text-center">Add a Plant</h1>
      <p className="text-gray-500 text-xl text-center">
        Take a clear photo — AI will identify it and add it to your library automatically
      </p>
      <button
        className="w-full bg-green-600 text-white text-xl font-bold py-5 rounded-2xl flex items-center justify-center gap-3 active:bg-green-700 transition-colors mt-4"
        onClick={() => fileRef.current.click()}
      >
        <Camera size={28} /> Open Camera
      </button>
      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        className="hidden" onChange={handleFile} />
    </div>
  )

  // ── Scanning ──
  if (step === 'scanning') return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-8">
      {thumbnail && (
        <img src={thumbnail} alt="plant" className="w-56 h-56 object-cover rounded-3xl shadow-lg" />
      )}
      <Loader className="animate-spin text-green-600" size={44} />
      <p className="text-xl font-semibold text-gray-700">Identifying your plant...</p>
      <p className="text-gray-400 text-base">AI is looking at the photo</p>
    </div>
  )

  // ── Auto-save countdown (high confidence) ──
  if (step === 'success') return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-6">
      {thumbnail && (
        <img src={thumbnail} alt="plant"
          className="w-64 h-64 object-cover rounded-3xl shadow-lg" />
      )}
      <div className="bg-green-50 border-2 border-green-300 rounded-3xl p-6 w-full text-center">
        <div className="text-5xl mb-2">{categoryEmoji(identified?.category)}</div>
        <h2 className="text-3xl font-bold text-green-800">{identified?.name}</h2>
        {identified?.species && (
          <p className="text-green-600 text-base italic mt-1">{identified.species}</p>
        )}
        {identified?.careSummary && (
          <p className="text-gray-600 text-base mt-3">{identified.careSummary}</p>
        )}
      </div>

      <div className="w-full text-center">
        <p className="text-gray-500 text-lg mb-4">
          Adding to your library in <strong className="text-green-600 text-2xl">{countdown}</strong>...
        </p>
        <button
          className="w-full border-2 border-gray-200 text-gray-600 text-lg font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 active:bg-gray-50"
          onClick={cancelCountdown}
        >
          <Edit2 size={20} /> Edit name or category
        </button>
      </div>
    </div>
  )

  // ── Manual edit (low confidence or no key) ──
  if (step === 'edit') return (
    <div className="flex flex-col gap-5 px-6 pt-8 pb-24">
      <h1 className="text-2xl font-bold text-gray-900">Confirm Plant</h1>

      {thumbnail && (
        <img src={thumbnail} alt="plant"
          className="w-full aspect-square object-cover rounded-2xl shadow" />
      )}

      {identified?.name && identified.name !== 'Unknown Plant' && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
          <p className="text-green-800 font-semibold text-lg">
            AI thinks this is: {identified.name}
          </p>
          {identified.careSummary && (
            <p className="text-gray-600 mt-1 text-base">{identified.careSummary}</p>
          )}
        </div>
      )}

      {error && <p className="text-orange-600 font-medium">{error}</p>}

      <div>
        <label className="block text-lg font-semibold text-gray-800 mb-2">Plant Name</label>
        <input
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-xl focus:border-green-500 outline-none"
          placeholder="e.g. Basil, Rose, Tomato"
          value={editName}
          onChange={e => setEditName(e.target.value)}
          autoFocus
        />
      </div>

      <div>
        <label className="block text-lg font-semibold text-gray-800 mb-2">Category</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(cat => (
            <button key={cat}
              className={`px-4 py-2 rounded-xl text-base font-medium border-2 capitalize transition-colors ${
                editCategory === cat
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
              onClick={() => setEditCategory(cat)}
            >
              {categoryEmoji(cat)} {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3 mt-2">
        <button
          className="flex-1 border-2 border-gray-200 text-gray-600 text-lg font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 active:bg-gray-50"
          onClick={() => { setStep('capture'); setThumbnail(null) }}
        >
          <XCircle size={22} /> Retake
        </button>
        <button
          className="flex-1 bg-green-600 text-white text-lg font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 active:bg-green-700 disabled:opacity-40"
          onClick={() => doSave({ name: editName.trim(), species: identified?.species || '', category: editCategory, careSummary: identified?.careSummary || '' })}
          disabled={!editName.trim()}
        >
          <CheckCircle size={22} /> Save Plant
        </button>
      </div>
    </div>
  )

  // ── Saving ──
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="text-5xl">🌱</div>
      <p className="text-xl font-semibold text-gray-700">Adding to your garden...</p>
    </div>
  )
}

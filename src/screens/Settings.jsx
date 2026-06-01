import { useState, useEffect } from 'react'
import { Save, Eye, EyeOff, CheckCircle, Download, Smartphone, KeyRound } from 'lucide-react'
import { getSetting, saveSetting } from '../db'
import { useInstallPrompt } from '../hooks/useInstallPrompt'
import { hasServerKey } from '../ai'

export default function Settings() {
  const [apiKey, setApiKey] = useState('')
  const [interval, setInterval] = useState('weekly')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [serverKeyActive, setServerKeyActive] = useState(false)
  const { canInstall, isInstalled, triggerInstall } = useInstallPrompt()

  useEffect(() => {
    async function load() {
      const [k, iv, sk] = await Promise.all([getSetting('apiKey'), getSetting('interval'), hasServerKey()])
      if (k) setApiKey(k)
      if (iv) setInterval(iv)
      setServerKeyActive(sk)
    }
    load()
  }, [])

  async function handleSave() {
    await Promise.all([
      saveSetting('apiKey', apiKey.trim()),
      saveSetting('interval', interval)
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="px-5 pt-8 pb-24">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

      {/* Install app card */}
      {isInstalled ? (
        <div className="mb-8 bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
          <Smartphone className="text-green-600 flex-shrink-0" size={26} />
          <div>
            <p className="font-semibold text-green-800">App is installed ✓</p>
            <p className="text-green-600 text-sm">Plant Library is on your home screen</p>
          </div>
        </div>
      ) : canInstall ? (
        <div className="mb-8 bg-green-700 rounded-2xl p-5">
          <p className="text-white font-bold text-lg mb-1">📲 Add to Home Screen</p>
          <p className="text-green-200 text-base mb-4">
            Install Plant Library as an app — works offline, opens instantly, no browser bar.
          </p>
          <button
            className="w-full bg-white text-green-700 font-bold text-lg py-4 rounded-xl flex items-center justify-center gap-2 active:bg-green-50"
            onClick={triggerInstall}
          >
            <Download size={22} /> Install App
          </button>
        </div>
      ) : (
        <div className="mb-8 bg-gray-100 rounded-2xl p-4 flex items-start gap-3">
          <Smartphone className="text-gray-400 flex-shrink-0 mt-0.5" size={22} />
          <div>
            <p className="font-semibold text-gray-700">Install as a phone app</p>
            <p className="text-gray-400 text-sm mt-0.5">
              Open this page in <strong>Chrome</strong> on Android and tap the install banner at the top.{' '}
              On iPhone, use Safari → Share → "Add to Home Screen".
            </p>
          </div>
        </div>
      )}

      {/* API Key */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-3">AI Key</h2>

        {serverKeyActive ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
            <KeyRound className="text-green-600 flex-shrink-0 mt-0.5" size={22} />
            <div>
              <p className="font-semibold text-green-800">Shared family key active ✓</p>
              <p className="text-green-600 text-sm mt-0.5">
                AI works on all family phones automatically — no key needed here.
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-gray-400 mb-1 text-base leading-snug">
              Needed for plant identification and health tips.
            </p>
            <p className="text-green-700 font-medium mb-4 text-base">
              Free — no credit card needed.{' '}
              <a href="https://aistudio.google.com/apikey" className="underline" target="_blank" rel="noreferrer">
                Get your free key at aistudio.google.com
              </a>
            </p>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-4 text-base focus:border-green-500 outline-none pr-14"
                placeholder="AIza..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400"
                onClick={() => setShowKey(v => !v)}
              >
                {showKey ? <EyeOff size={22} /> : <Eye size={22} />}
              </button>
            </div>
            {!apiKey && (
              <p className="mt-2 text-orange-600 text-sm">
                Without a key, you can still add plants manually — just type the name yourself.
              </p>
            )}
          </>
        )}
      </section>

      {/* Photo interval */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Update Reminder</h2>
        <p className="text-gray-400 mb-4 text-base">How often should you photograph your plants?</p>
        <div className="flex gap-3">
          {['daily', 'weekly'].map(opt => (
            <button
              key={opt}
              className={`flex-1 py-4 rounded-xl text-lg font-semibold border-2 transition-colors capitalize ${
                interval === opt
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
              onClick={() => setInterval(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      </section>

      {/* Save */}
      <button
        className="w-full bg-green-600 text-white text-xl font-bold py-5 rounded-2xl flex items-center justify-center gap-3 active:bg-green-700 transition-colors"
        onClick={handleSave}
      >
        {saved ? <CheckCircle size={26} /> : <Save size={26} />}
        {saved ? 'Saved!' : 'Save Settings'}
      </button>

      {/* About */}
      <div className="mt-10 border-t border-gray-100 pt-8 text-center text-gray-400 text-sm space-y-1">
        <p className="text-lg font-semibold text-gray-600">🌿 Plant Library</p>
        <p>Photos stored privately on this device</p>
        <p>Your API key never leaves your phone</p>
      </div>
    </div>
  )
}

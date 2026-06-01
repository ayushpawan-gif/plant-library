import { useState, useEffect } from 'react'
import NavBar from './components/NavBar'
import InstallBanner from './components/InstallBanner'
import Library from './screens/Library'
import GardenView from './screens/GardenView'
import AddPlant from './screens/AddPlant'
import PlantDetail from './screens/PlantDetail'
import Settings from './screens/Settings'
import { useInstallPrompt } from './hooks/useInstallPrompt'

function getHash() {
  return window.location.hash || '#library'
}

export default function App() {
  const [hash, setHash] = useState(getHash)
  const { canInstall, triggerInstall } = useInstallPrompt()

  useEffect(() => {
    const onHash = () => setHash(getHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const navHash = hash.startsWith('#plant/') ? '#library' : hash

  function renderScreen() {
    if (hash === '#library') return <Library />
    if (hash === '#garden') return <GardenView />
    if (hash === '#add') return <AddPlant onDone={() => (window.location.hash = '#library')} />
    if (hash === '#settings') return <Settings />
    if (hash.startsWith('#plant/')) {
      const id = parseInt(hash.replace('#plant/', ''), 10)
      return <PlantDetail plantId={id} onBack={() => (window.location.hash = '#library')} />
    }
    return <Library />
  }

  return (
    <div className={`min-h-screen bg-gray-50 pb-20 ${canInstall ? 'pt-16' : ''}`}>
      {canInstall && <InstallBanner onInstall={triggerInstall} />}
      {renderScreen()}
      <NavBar current={navHash} />
    </div>
  )
}

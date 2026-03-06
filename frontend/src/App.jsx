// src/App.jsx
import { Activity } from 'lucide-react'
import Header from './components/Header/Header'
import SolarStatus from './components/SolarStatus/SolarStatus'
import NeoTracker from './components/NeoTracker/NeoTracker'
import EarthGlobe from './components/EarthGlobe/EarthGlobe'
import MarsWeather from './components/MarsWeather/MarsWeather'
import SatelliteAlert from './components/SatelliteAlert/SatelliteAlert'
import APOD from './components/APOD/APOD'
import { useSpacePulse } from './hooks/useSpacePulse'

export default function App() {
  const { summary, alerts, neos, earthEvents, marsWeather, satellites, loading, lastUpdated } = useSpacePulse()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] text-slate-200 flex justify-center items-center">
        <div className="text-blue-400 text-xl animate-pulse flex flex-col items-center">
          <Activity className="animate-spin mb-4" size={40} />
          Syncing with NASA satellites...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-6 font-sans">
      <Header summary={summary} lastUpdated={lastUpdated} />

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column */}
        <div className="lg:col-span-3 space-y-6">
          <SolarStatus alerts={alerts} />
          <NeoTracker neos={neos} />
        </div>

        {/* Center column - Earth Globe takes most space */}
        <div className="lg:col-span-6">
          <EarthGlobe events={earthEvents} />
        </div>

        {/* Right column */}
        <div className="lg:col-span-3 space-y-6">
          <MarsWeather data={marsWeather} />
          <SatelliteAlert satellites={satellites} />
          <APOD />
        </div>
      </main>
    </div>
  )
}

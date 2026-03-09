import StarField from './components/StarField/StarField'
import Header from './components/Header/Header'
import SolarStatus from './components/SolarStatus/SolarStatus'
import NeoTracker from './components/NeoTracker/NeoTracker'
import EarthGlobe from './components/EarthGlobe/EarthGlobe'
import MarsWeather from './components/MarsWeather/MarsWeather'
import SatelliteAlert from './components/SatelliteAlert/SatelliteAlert'
import APOD from './components/APOD/APOD'
import { useSpacePulse } from './hooks/useSpacePulse'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      {/* Orbital spinner */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border border-blue-500/20" />
        <div className="absolute inset-3 rounded-full border border-cyan-500/15" />
        <div
          className="absolute w-3 h-3 rounded-full bg-blue-400"
          style={{
            top: '2px', left: '50%',
            marginLeft: '-6px',
            boxShadow: '0 0 10px #60a5fa, 0 0 20px #3b82f680',
            animation: 'orbit 2.4s linear infinite',
            transformOrigin: '6px 36px',
          }}
        />
        <div
          className="absolute w-2 h-2 rounded-full bg-violet-400"
          style={{
            top: '50%', left: '2px',
            marginTop: '-4px',
            boxShadow: '0 0 8px #a78bfa',
            animation: 'orbit 4s linear infinite reverse',
            transformOrigin: '36px 4px',
          }}
        />
      </div>
      <p className="text-blue-400/80 text-xs tracking-[0.25em] uppercase">
        Syncing with the cosmos…
      </p>
    </div>
  )
}

export default function App() {
  const {
    summary, alerts, neos, earthEvents,
    marsWeather, satellites, loading, lastUpdated,
  } = useSpacePulse()

  return (
    <div className="min-h-screen relative">
      <StarField />

      <div className="relative z-10">
        {loading ? (
          <LoadingScreen />
        ) : (
          <div className="max-w-[1680px] mx-auto px-5 py-5 space-y-5">
            {/* Header with KPIs */}
            <Header summary={summary} lastUpdated={lastUpdated} />

            {/* APOD — prominent hero section */}
            <div className="anim-card anim-delay-1">
              <APOD />
            </div>

            {/* Dashboard grid */}
            <main className="grid grid-cols-12 gap-5">
              {/* Left column */}
              <div className="col-span-12 lg:col-span-3 flex flex-col gap-5">
                <div className="anim-card anim-delay-2">
                  <SolarStatus alerts={alerts} />
                </div>
                <div className="anim-card anim-delay-3">
                  <NeoTracker neos={neos} />
                </div>
              </div>

              {/* Center — Earth events map */}
              <div className="col-span-12 lg:col-span-6 anim-card anim-delay-2">
                <EarthGlobe events={earthEvents} />
              </div>

              {/* Right column */}
              <div className="col-span-12 lg:col-span-3 flex flex-col gap-5">
                <div className="anim-card anim-delay-3">
                  <MarsWeather data={marsWeather} />
                </div>
                <div className="anim-card anim-delay-4">
                  <SatelliteAlert satellites={satellites} />
                </div>
              </div>
            </main>
          </div>
        )}
      </div>
    </div>
  )
}

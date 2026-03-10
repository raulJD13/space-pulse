import { motion } from 'framer-motion'
import StarField from './components/StarField/StarField'
import SystemStatusBar from './components/SystemStatusBar/SystemStatusBar'
import Header from './components/Header/Header'
import SolarStatus from './components/SolarStatus/SolarStatus'
import NeoTracker from './components/NeoTracker/NeoTracker'
import EarthGlobe from './components/EarthGlobe/EarthGlobe'
import MarsWeather from './components/MarsWeather/MarsWeather'
import SatelliteAlert from './components/SatelliteAlert/SatelliteAlert'
import APOD from './components/APOD/APOD'
import LiveFeed from './components/LiveFeed/LiveFeed'
import { useSpacePulse } from './hooks/useSpacePulse'

// Left column — cards stagger in with a slight upward drift + blur clear
const leftVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.13, delayChildren: 0.08 },
  },
}

// Right column — starts slightly later for organic feel
const rightVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.13, delayChildren: 0.22 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 22, filter: 'blur(3px)' },
  show: {
    opacity: 1, y: 0, filter: 'blur(0px)',
    transition: { duration: 0.6, ease: [0.23, 1, 0.32, 1] },
  },
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border border-blue-500/15" />
        <div className="absolute inset-4 rounded-full border border-cyan-500/10" />
        <div
          className="absolute w-3 h-3 rounded-full bg-blue-400"
          style={{
            top: '2px', left: '50%', marginLeft: '-6px',
            boxShadow: '0 0 10px #60a5fa, 0 0 20px #3b82f680',
            animation: 'orbit 2.4s linear infinite',
            transformOrigin: '6px 36px',
          }}
        />
        <div
          className="absolute w-2 h-2 rounded-full bg-violet-400"
          style={{
            top: '50%', left: '2px', marginTop: '-4px',
            boxShadow: '0 0 8px #a78bfa',
            animation: 'orbit 3.8s linear infinite reverse',
            transformOrigin: '36px 4px',
          }}
        />
      </div>
      <p className="text-blue-400/70 text-[11px] tracking-[0.3em] uppercase font-medium">
        Initializing Mission Control…
      </p>
    </div>
  )
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 px-4">
      <div
        className="cosmic-card max-w-md w-full p-8 text-center"
        style={{ borderColor: 'rgba(239,68,68,0.35)' }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          <span className="text-red-400 text-xl font-bold">!</span>
        </div>
        <h2 className="text-slate-200 font-bold mb-2">API Unreachable</h2>
        <p className="text-slate-500 text-sm leading-relaxed mb-5">{message}</p>
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg text-sm font-medium text-blue-300 hover:text-blue-200 transition-colors"
          style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)' }}
        >
          Retry
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const {
    summary, alerts, neos, earthEvents,
    marsWeather, satellites, loading, lastUpdated, error, refetch,
  } = useSpacePulse()

  const sourceData = {
    alerts,
    neos,
    earthEvents,
    marsWeather,
    satellites,
    apod: null,
  }

  return (
    <div className="min-h-screen relative">
      <StarField />

      <div className="relative z-10">
        {loading ? (
          <LoadingScreen />
        ) : error ? (
          <ErrorScreen message={error} onRetry={refetch} />
        ) : (
          <>
            <SystemStatusBar
              summary={summary}
              data={sourceData}
              lastUpdated={lastUpdated}
            />

            <div
              className="max-w-[1680px] mx-auto px-5 pt-4 pb-6 space-y-4"
              style={{ perspective: '2200px', perspectiveOrigin: '50% 30%' }}
            >
              {/* KPI strip */}
              <motion.div
                initial={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
              >
                <Header summary={summary} alerts={alerts} lastUpdated={lastUpdated} />
              </motion.div>

              {/* 3-column mission grid */}
              <main className="grid grid-cols-12 gap-4 items-start">

                {/* Left column */}
                <motion.div
                  className="col-span-12 lg:col-span-3 flex flex-col gap-4"
                  variants={leftVariants}
                  initial="hidden"
                  animate="show"
                >
                  <motion.div variants={cardVariants}><SolarStatus alerts={alerts} /></motion.div>
                  <motion.div variants={cardVariants}><NeoTracker neos={neos} /></motion.div>
                  <motion.div variants={cardVariants}><LiveFeed alerts={alerts} /></motion.div>
                </motion.div>

                {/* Center — EarthGlobe centerpiece */}
                <motion.div
                  className="col-span-12 lg:col-span-6"
                  initial={{ opacity: 0, scale: 0.975, y: 12, filter: 'blur(6px)' }}
                  animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.75, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
                >
                  <EarthGlobe events={earthEvents} />
                </motion.div>

                {/* Right column */}
                <motion.div
                  className="col-span-12 lg:col-span-3 flex flex-col gap-4"
                  variants={rightVariants}
                  initial="hidden"
                  animate="show"
                >
                  <motion.div variants={cardVariants}><APOD /></motion.div>
                  <motion.div variants={cardVariants}><MarsWeather data={marsWeather} /></motion.div>
                  <motion.div variants={cardVariants}><SatelliteAlert satellites={satellites} /></motion.div>
                </motion.div>

              </main>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

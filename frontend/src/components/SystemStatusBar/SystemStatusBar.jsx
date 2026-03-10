import { Sun, AlertTriangle, Globe, Thermometer, Satellite, Camera } from 'lucide-react'
import { useRefreshCountdown } from '../../hooks/useRefreshCountdown'

const SOURCES = [
  { key: 'alerts',      label: 'Solar',   icon: Sun       },
  { key: 'neos',        label: 'NEO',     icon: AlertTriangle },
  { key: 'earthEvents', label: 'Earth',   icon: Globe     },
  { key: 'marsWeather', label: 'Mars',    icon: Thermometer },
  { key: 'satellites',  label: 'Sat',     icon: Satellite },
  { key: 'apod',        label: 'APOD',    icon: Camera    },
]

const STATUS_STYLES = {
  NORMAL:   'text-green-400 bg-green-500/10 border-green-500/25',
  ELEVATED: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25',
  HIGH:     'text-orange-400 bg-orange-500/10 border-orange-500/25',
  CRITICAL: 'text-red-400 bg-red-500/10 border-red-500/25',
}

const STATUS_GLOW = {
  NORMAL:   'rgba(34,197,94,0.12)',
  ELEVATED: 'rgba(234,179,8,0.12)',
  HIGH:     'rgba(249,115,22,0.12)',
  CRITICAL: 'rgba(239,68,68,0.18)',
}

function sourceHealth(key, data) {
  const val = data[key]
  if (val === undefined || val === null) return 'no-data'
  if (Array.isArray(val)) return val.length > 0 ? 'ok' : 'empty'
  return 'ok'
}

export default function SystemStatusBar({ summary, data, lastUpdated }) {
  const countdown = useRefreshCountdown(lastUpdated)
  const status = summary?.system_status || 'NORMAL'
  const sc = STATUS_STYLES[status] || STATUS_STYLES.NORMAL
  const glowColor = STATUS_GLOW[status] || STATUS_GLOW.NORMAL

  return (
    <div
      className="sticky top-0 z-50 w-full"
      style={{
        background: 'rgba(2,8,23,0.97)',
        borderBottom: `1px solid ${glowColor.replace('0.12', '0.2').replace('0.18', '0.25')}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: `0 1px 20px ${glowColor}`,
      }}
    >
      <div className="max-w-[1680px] mx-auto px-5 h-10 flex items-center justify-between gap-4">

        {/* Left: Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)' }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-glow-pulse" />
          </div>
          <span className="text-[11px] font-black tracking-[0.18em] text-slate-200 uppercase">
            Space Pulse
          </span>
          <span className="hidden sm:block text-[9px] text-slate-600 tracking-wider font-medium">
            Mission Control
          </span>
        </div>

        {/* Center: Source health indicators */}
        <div className="hidden lg:flex items-center gap-5">
          {SOURCES.map(({ key, label }) => {
            const health = sourceHealth(key, data)
            const dotColor =
              health === 'ok'      ? '#4ade80' :
              health === 'empty'   ? '#fb923c' :
                                     '#ef4444'
            const dotGlow = health === 'ok' ? '0 0 5px #4ade8080' : 'none'
            return (
              <div key={key} className="flex items-center gap-1.5 cursor-default group">
                <div
                  className="w-1.5 h-1.5 rounded-full transition-all"
                  style={{ background: dotColor, boxShadow: dotGlow }}
                />
                <span className="text-[9px] text-slate-600 group-hover:text-slate-400 transition-colors tracking-widest uppercase">
                  {label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Right: Countdown + status + LIVE */}
        <div className="flex items-center gap-3 shrink-0">
          {lastUpdated && (
            <div className="hidden sm:flex items-center gap-1.5">
              <span className="text-[9px] text-slate-700 tracking-wider">REFRESH</span>
              <span className="text-[9px] font-mono text-slate-500">{countdown}</span>
            </div>
          )}

          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border tracking-[0.12em] ${sc}`}>
            {status}
          </span>

          <div className="flex items-center gap-1.5">
            <div className="live-dot" />
            <span className="hidden sm:block text-[9px] text-green-400/60 tracking-[0.15em] font-semibold">LIVE</span>
          </div>
        </div>

      </div>
    </div>
  )
}

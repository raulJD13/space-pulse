import { motion } from 'framer-motion'
import { AlertTriangle, Zap, Navigation } from 'lucide-react'

const RISK = {
  CRITICAL: {
    badge:  'bg-red-500/15 text-red-400 border-red-500/30',
    accent: '#ef4444',
    row:    'rgba(239,68,68,0.04)',
  },
  HIGH: {
    badge:  'bg-orange-500/15 text-orange-400 border-orange-500/30',
    accent: '#f97316',
    row:    'rgba(249,115,22,0.04)',
  },
  MEDIUM: {
    badge:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    accent: '#eab308',
    row:    'transparent',
  },
  LOW: {
    badge:  'bg-green-500/12 text-green-400 border-green-500/22',
    accent: '#22c55e',
    row:    'transparent',
  },
}

export default function NeoTracker({ neos }) {
  return (
    <div className="cosmic-card p-4">
      <div className="flex items-center gap-2 section-sep">
        <AlertTriangle size={14} className="text-orange-400" />
        <h2 className="text-[11px] font-bold text-slate-200 tracking-[0.12em] uppercase">
          Near-Earth Objects
        </h2>
        <span className="ml-auto text-[9px] text-orange-400/70 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
          {neos.length} tracked
        </span>
      </div>

      {neos.length > 0 ? (
        <div className="space-y-1.5">
          {neos.slice(0, 7).map((neo, i) => {
            const risk = RISK[neo.risk_level] || RISK.LOW
            const isHighRisk = neo.risk_level === 'CRITICAL' || neo.risk_level === 'HIGH'
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.055, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                className="relative rounded-lg px-2.5 py-2 flex items-center gap-2 overflow-hidden"
                style={{
                  background: risk.row,
                  border: `1px solid ${isHighRisk ? risk.accent + '22' : 'rgba(255,255,255,0.03)'}`,
                }}
              >
                {/* Left accent line */}
                {isHighRisk && (
                  <div
                    className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full"
                    style={{
                      background: `linear-gradient(to bottom, ${risk.accent}, ${risk.accent}40)`,
                    }}
                  />
                )}

                {/* Hazard dot */}
                <div
                  className="shrink-0 w-1.5 h-1.5 rounded-full"
                  style={{
                    background: neo.is_hazardous ? '#ef4444' : risk.accent,
                    boxShadow: `0 0 5px ${neo.is_hazardous ? '#ef4444' : risk.accent}80`,
                  }}
                />

                {/* Name */}
                <span className="flex-1 text-[11px] text-slate-300 truncate leading-none font-medium">
                  {neo.neo_name}
                </span>

                {/* Stats row */}
                <div className="flex items-center gap-2 shrink-0">
                  {neo.miss_distance_lunar != null && (
                    <span className="flex items-center gap-0.5 text-[9px] text-slate-600 font-mono">
                      <Navigation size={7} className="text-slate-700" />
                      {neo.miss_distance_lunar.toFixed(1)}
                      <span className="text-slate-700">LD</span>
                    </span>
                  )}
                  {neo.velocity_km_s != null && (
                    <span className="flex items-center gap-0.5 text-[9px] text-slate-600 font-mono">
                      <Zap size={7} className="text-slate-700" />
                      {neo.velocity_km_s.toFixed(1)}
                    </span>
                  )}
                  {neo.days_until_approach != null && (
                    <span className="text-[9px] font-mono text-slate-500">
                      {neo.days_until_approach}d
                    </span>
                  )}
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${risk.badge}`}>
                    {neo.risk_level}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="py-6 text-center space-y-1.5">
          <AlertTriangle size={18} className="text-slate-700 mx-auto" />
          <p className="text-slate-500 text-[11px]">No high-risk approaches scheduled</p>
          <p className="text-slate-700 text-[10px]">Next 7-day window is clear</p>
        </div>
      )}
    </div>
  )
}

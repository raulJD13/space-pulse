import { motion, AnimatePresence } from 'framer-motion'
import { Sun, AlertTriangle, Globe, Satellite, Radio } from 'lucide-react'

const TYPE_CFG = {
  SOLAR_FLARE:       { Icon: Sun,           color: '#f59e0b', label: 'Solar',  bgColor: 'rgba(245,158,11,0.08)' },
  NEAR_EARTH_OBJECT: { Icon: AlertTriangle, color: '#f97316', label: 'NEO',    bgColor: 'rgba(249,115,22,0.07)' },
  EARTH_EVENT:       { Icon: Globe,         color: '#06b6d4', label: 'Earth',  bgColor: 'rgba(6,182,212,0.07)'  },
  SATELLITE_ANOMALY: { Icon: Satellite,     color: '#8b5cf6', label: 'Sat',    bgColor: 'rgba(139,92,246,0.07)' },
}

const SEV_COLOR = {
  CRITICAL: '#ef4444',
  HIGH:     '#f97316',
  MEDIUM:   '#eab308',
  LOW:      '#22c55e',
}

function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function LiveFeed({ alerts }) {
  const recent = [...(alerts || [])]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8)

  return (
    <div className="cosmic-card p-4">
      <div className="flex items-center gap-2 section-sep">
        <Radio size={13} className="text-blue-400" />
        <h2 className="text-[10px] font-bold text-slate-300 tracking-[0.14em] uppercase">Activity</h2>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="live-dot" style={{ width: 5, height: 5 }} />
          <span className="text-[9px] text-green-400/50 tracking-widest">ACTIVE</span>
        </div>
      </div>

      {recent.length === 0 ? (
        <div className="py-5 text-center space-y-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center mx-auto"
            style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)' }}
          >
            <Radio size={13} className="text-blue-400/30" />
          </div>
          <p className="text-[11px] text-slate-600">All systems nominal</p>
          <p className="text-[10px] text-slate-700">Monitoring active across all sources</p>
        </div>
      ) : (
        <div className="space-y-1 max-h-44 overflow-y-auto pr-0.5">
          <AnimatePresence initial={false}>
            {recent.map((alert, i) => {
              const cfg = TYPE_CFG[alert.alert_type] || TYPE_CFG.SOLAR_FLARE
              const sevColor = SEV_COLOR[alert.severity] || SEV_COLOR.LOW
              return (
                <motion.div
                  key={alert.alert_id || i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ delay: i * 0.04, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
                  className="flex items-start gap-2 py-1.5 px-2 rounded-lg transition-colors hover:bg-white/[0.02] group"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                >
                  {/* Type dot with glow */}
                  <div
                    className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full"
                    style={{
                      background: cfg.color,
                      boxShadow: `0 0 5px ${cfg.color}90`,
                    }}
                  />

                  <p className="flex-1 text-[10px] text-slate-500 leading-relaxed line-clamp-2 group-hover:text-slate-400 transition-colors">
                    {alert.description}
                  </p>

                  <div className="shrink-0 flex flex-col items-end gap-0.5 mt-0.5">
                    <span
                      className="text-[7px] font-bold tracking-wider"
                      style={{ color: sevColor }}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-[8px] font-mono text-slate-700">
                      {timeAgo(alert.created_at)}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

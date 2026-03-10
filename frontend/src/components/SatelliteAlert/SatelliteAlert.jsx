import { motion } from 'framer-motion'
import { Satellite } from 'lucide-react'

function AnomalyBar({ score }) {
  const pct = Math.min(100, Math.max(0, Math.abs(score || 0) * 100))
  const color = pct > 60 ? '#ef4444' : pct > 30 ? '#f97316' : '#f59e0b'
  return (
    <div className="h-0.5 w-full rounded-full bg-slate-800 mt-1.5 overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, background: color, boxShadow: `0 0 4px ${color}` }}
      />
    </div>
  )
}

export default function SatelliteAlert({ satellites }) {
  const anomalous = (satellites || []).filter(s => s.is_anomalous)

  return (
    <div className="cosmic-card p-4" style={{ borderColor: 'rgba(139,92,246,0.18)' }}>
      <div className="flex items-center gap-2 section-sep" style={{ borderColor: 'rgba(139,92,246,0.12)' }}>
        <Satellite size={14} className="text-violet-400" />
        <h2 className="text-[11px] font-bold text-slate-200 tracking-[0.12em] uppercase">Satellites</h2>
        <span className="ml-auto text-[9px] text-violet-400/70 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
          {anomalous.length} anomalies
        </span>
      </div>

      {anomalous.length > 0 ? (
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {anomalous.map((sat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-lg p-2.5"
              style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-slate-300 truncate">{sat.satellite_name}</p>
                  <p className="text-[9px] text-slate-600 font-mono mt-0.5">
                    #{sat.satellite_id} · {sat.altitude_km?.toFixed(0)} km
                  </p>
                </div>
                <span className="shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20">
                  ANOMALY
                </span>
              </div>
              {sat.anomaly_score != null && <AnomalyBar score={sat.anomaly_score} />}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="py-5 flex flex-col items-center gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)' }}
          >
            <Satellite size={14} className="text-green-400" />
          </div>
          <p className="text-slate-500 text-[11px]">Nominal orbital behavior</p>
          <p className="text-slate-700 text-[10px]">All tracked satellites within parameters</p>
        </div>
      )}
    </div>
  )
}

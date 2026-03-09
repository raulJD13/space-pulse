import { Satellite } from 'lucide-react'

function AnomalyBar({ score }) {
  // score is negative; more negative = more anomalous
  // Map -1 to 0 range to 0-100% (flip sign, clamp)
  const pct = Math.min(100, Math.max(0, Math.abs(score) * 100))
  const color = pct > 60 ? '#ef4444' : pct > 30 ? '#f97316' : '#f59e0b'
  return (
    <div className="h-1 w-full rounded-full bg-slate-800 mt-1 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color, boxShadow: `0 0 4px ${color}` }}
      />
    </div>
  )
}

export default function SatelliteAlert({ satellites }) {
  const anomalous = (satellites || []).filter(s => s.is_anomalous)

  return (
    <div className="cosmic-card p-5" style={{ borderColor: 'rgba(139,92,246,0.2)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 section-sep" style={{ borderColor: 'rgba(139,92,246,0.15)' }}>
        <Satellite size={16} className="text-violet-400" />
        <h2 className="text-sm font-bold text-slate-200 tracking-wide uppercase">Satellite Anomalies</h2>
        <span className="ml-auto text-[10px] text-violet-400/70 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
          {anomalous.length} detected
        </span>
      </div>

      {anomalous.length > 0 ? (
        <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
          {anomalous.map((sat, i) => (
            <div
              key={i}
              className="rounded-lg p-3"
              style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.18)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{sat.satellite_name}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5 font-mono">
                    ID {sat.satellite_id} · {sat.altitude_km?.toFixed(0)} km alt
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/25">
                    ANOMALY
                  </span>
                  <p className="text-[10px] font-mono text-slate-500 mt-1">{sat.anomaly_score?.toFixed(3)}</p>
                </div>
              </div>
              {sat.anomaly_score != null && <AnomalyBar score={sat.anomaly_score} />}
            </div>
          ))}
        </div>
      ) : (
        <div className="py-7 flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <Satellite size={18} className="text-green-400" />
          </div>
          <p className="text-slate-500 text-sm">All satellites nominal</p>
          <p className="text-slate-700 text-xs">No anomalies detected</p>
        </div>
      )}
    </div>
  )
}

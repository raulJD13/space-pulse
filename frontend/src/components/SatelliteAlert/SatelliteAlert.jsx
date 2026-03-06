// src/components/SatelliteAlert/SatelliteAlert.jsx
import { Satellite } from 'lucide-react'

export default function SatelliteAlert({ satellites }) {
  const anomalous = (satellites || []).filter(s => s.is_anomalous)

  return (
    <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-800">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
        <Satellite size={18} className="text-purple-400" />
        <h2 className="text-lg font-bold text-slate-300">Satellite Anomalies</h2>
        <span className="ml-auto text-xs text-slate-500">{anomalous.length} detected</span>
      </div>

      {anomalous.length > 0 ? (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {anomalous.map((sat, i) => (
            <div key={i} className="bg-slate-900/50 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-300">{sat.satellite_name}</p>
                <p className="text-xs text-slate-500">
                  ID: {sat.satellite_id} | Alt: {sat.altitude_km?.toFixed(0)} km
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono text-red-400">
                  {sat.anomaly_score?.toFixed(3)}
                </p>
                <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                  ANOMALY
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-slate-500 text-sm text-center py-6">
          No anomalies detected. All satellites nominal.
        </p>
      )}
    </div>
  )
}

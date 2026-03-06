// src/components/NeoTracker/NeoTracker.jsx
import { AlertTriangle } from 'lucide-react'

const riskColors = {
  CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/50',
  HIGH: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  MEDIUM: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  LOW: 'bg-green-500/20 text-green-400 border-green-500/50',
}

export default function NeoTracker({ neos }) {
  return (
    <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-800">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
        <AlertTriangle size={18} className="text-orange-400" />
        <h2 className="text-lg font-bold text-slate-300">Near-Earth Objects</h2>
        <span className="ml-auto text-xs text-slate-500">{neos.length} tracked</span>
      </div>

      {neos.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-slate-500 uppercase">
              <tr>
                <th className="text-left py-2 pr-2">Name</th>
                <th className="text-right py-2 px-2">Size (km)</th>
                <th className="text-right py-2 px-2">Speed (km/s)</th>
                <th className="text-right py-2 px-2">Miss (LD)</th>
                <th className="text-right py-2 pl-2">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {neos.slice(0, 10).map((neo, i) => (
                <tr key={i} className="hover:bg-slate-800/50">
                  <td className="py-2 pr-2 text-slate-300 truncate max-w-[120px]">
                    {neo.is_hazardous && <span className="text-red-400 mr-1">*</span>}
                    {neo.neo_name}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-400">
                    {neo.diameter_max_km?.toFixed(3)}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-400">
                    {neo.velocity_km_s?.toFixed(1)}
                  </td>
                  <td className="py-2 px-2 text-right text-slate-400">
                    {neo.miss_distance_lunar?.toFixed(1)}
                  </td>
                  <td className="py-2 pl-2 text-right">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-bold border ${riskColors[neo.risk_level] || riskColors.LOW}`}>
                      {neo.risk_level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-slate-500 text-sm text-center py-6">No NEO data available</p>
      )}
    </div>
  )
}

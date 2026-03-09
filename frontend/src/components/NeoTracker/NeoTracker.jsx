import { AlertTriangle } from 'lucide-react'

const RISK = {
  CRITICAL: { bar: 'bg-red-500',    badge: 'bg-red-500/20 text-red-400 border-red-500/30'    },
  HIGH:     { bar: 'bg-orange-500', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  MEDIUM:   { bar: 'bg-yellow-500', badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  LOW:      { bar: 'bg-green-500',  badge: 'bg-green-500/20 text-green-400 border-green-500/30'  },
}

export default function NeoTracker({ neos }) {
  return (
    <div className="cosmic-card p-5">
      <div className="flex items-center gap-2 section-sep">
        <AlertTriangle size={16} className="text-orange-400" />
        <h2 className="text-sm font-bold text-slate-200 tracking-wide uppercase">Near-Earth Objects</h2>
        <span className="ml-auto text-[10px] text-orange-400/70 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
          {neos.length} tracked
        </span>
      </div>

      {neos.length > 0 ? (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-600 uppercase text-[10px] tracking-wider">
                <th className="text-left pb-2 px-1">Name</th>
                <th className="text-right pb-2 px-1">km</th>
                <th className="text-right pb-2 px-1">km/s</th>
                <th className="text-right pb-2 px-1">LD</th>
                <th className="text-right pb-2 pl-1">Risk</th>
              </tr>
            </thead>
            <tbody>
              {neos.slice(0, 10).map((neo, i) => {
                const risk = RISK[neo.risk_level] || RISK.LOW
                return (
                  <tr
                    key={i}
                    className={`border-b border-slate-800/50 last:border-0 transition-colors hover:bg-blue-500/5 ${
                      neo.is_hazardous ? 'bg-red-500/5' : ''
                    }`}
                  >
                    <td className="py-2 px-1 max-w-[100px]">
                      <span className="truncate block text-slate-300">
                        {neo.is_hazardous && (
                          <span className="text-red-400 mr-1">●</span>
                        )}
                        {neo.neo_name}
                      </span>
                    </td>
                    <td className="py-2 px-1 text-right text-slate-500 font-mono">
                      {neo.diameter_max_km?.toFixed(3)}
                    </td>
                    <td className="py-2 px-1 text-right text-slate-500 font-mono">
                      {neo.velocity_km_s?.toFixed(1)}
                    </td>
                    <td className="py-2 px-1 text-right text-slate-500 font-mono">
                      {neo.miss_distance_lunar?.toFixed(1)}
                    </td>
                    <td className="py-2 pl-1 text-right">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${risk.badge}`}>
                        {neo.risk_level}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-slate-600 text-sm text-center py-8">No NEO data available</p>
      )}
    </div>
  )
}

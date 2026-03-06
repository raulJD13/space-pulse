// src/components/SolarStatus/SolarStatus.jsx
import { Sun } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const flareColors = { X: '#ef4444', M: '#f97316', C: '#eab308', B: '#22c55e', A: '#6b7280' }

export default function SolarStatus({ alerts }) {
  const solarAlerts = alerts.filter(a => a.alert_type === 'SOLAR_FLARE')

  // Group by flare class letter
  const classCounts = {}
  solarAlerts.forEach(a => {
    const match = a.description?.match(/class\s+([XMCBA])/i)
    const letter = match ? match[1].toUpperCase() : '?'
    classCounts[letter] = (classCounts[letter] || 0) + 1
  })

  const chartData = Object.entries(classCounts)
    .map(([name, count]) => ({ name, count, color: flareColors[name] || '#94a3b8' }))
    .sort((a, b) => {
      const order = { X: 0, M: 1, C: 2, B: 3, A: 4 }
      return (order[a.name] ?? 5) - (order[b.name] ?? 5)
    })

  return (
    <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-800">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
        <Sun size={18} className="text-yellow-400" />
        <h2 className="text-lg font-bold text-slate-300">Solar Activity</h2>
        <span className="ml-auto text-xs text-slate-500">{solarAlerts.length} events</span>
      </div>

      {chartData.length > 0 ? (
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-slate-500 text-sm text-center py-6">No solar events recorded</p>
      )}

      {/* Recent flares list */}
      <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto">
        {solarAlerts.slice(0, 5).map((a, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-slate-400 truncate flex-1">{a.description}</span>
            <span className={`ml-2 px-1.5 py-0.5 rounded text-xs font-bold
              ${a.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                a.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                'bg-yellow-500/20 text-yellow-400'}`}>
              {a.severity}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

import { Sun } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const FLARE_COLORS = { X: '#ef4444', M: '#f97316', C: '#eab308', B: '#22c55e', A: '#6b7280' }
const FLARE_ORDER  = { X: 0, M: 1, C: 2, B: 3, A: 4 }

const SEV_STYLE = {
  CRITICAL: 'bg-red-500/20 text-red-400 border border-red-500/30',
  HIGH:     'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  MEDIUM:   'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
}

export default function SolarStatus({ alerts }) {
  const solarAlerts = alerts.filter(a => a.alert_type === 'SOLAR_FLARE')

  const classCounts = {}
  solarAlerts.forEach(a => {
    const m = a.description?.match(/class\s+([XMCBA])/i)
    const l = m ? m[1].toUpperCase() : '?'
    classCounts[l] = (classCounts[l] || 0) + 1
  })

  const chartData = Object.entries(classCounts)
    .map(([name, count]) => ({ name, count, color: FLARE_COLORS[name] || '#94a3b8' }))
    .sort((a, b) => (FLARE_ORDER[a.name] ?? 9) - (FLARE_ORDER[b.name] ?? 9))

  return (
    <div className="cosmic-card shine-on-hover p-5 h-full">
      {/* Header */}
      <div className="flex items-center gap-2 section-sep">
        <Sun size={17} className="text-amber-400 animate-corona" />
        <h2 className="text-sm font-bold text-slate-200 tracking-wide uppercase">Solar Activity</h2>
        <span className="ml-auto text-[10px] text-amber-400/70 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
          {solarAlerts.length} events
        </span>
      </div>

      {chartData.length > 0 ? (
        <div className="h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                stroke="#475569"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#475569"
                fontSize={10}
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(59,130,246,0.06)' }}
                contentStyle={{
                  background: 'rgba(6,14,32,0.95)',
                  border: '1px solid rgba(59,130,246,0.25)',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  fontSize: '12px',
                }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-36 flex items-center justify-center">
          <p className="text-slate-600 text-sm">No solar events recorded</p>
        </div>
      )}

      {/* Recent alerts list */}
      <div className="mt-3 space-y-1.5 max-h-28 overflow-y-auto pr-1">
        {solarAlerts.slice(0, 5).map((a, i) => (
          <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-slate-800/60 last:border-0">
            <span className="text-slate-400 truncate flex-1 leading-snug">{a.description}</span>
            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${SEV_STYLE[a.severity] || SEV_STYLE.MEDIUM}`}>
              {a.severity}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

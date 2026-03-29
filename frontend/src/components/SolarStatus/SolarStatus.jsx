import { motion } from 'framer-motion'
import { Sun } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const FLARE_COLORS = {
  X: '#ef4444',
  M: '#f97316',
  C: '#eab308',
  B: '#22c55e',
  A: '#6b7280',
}
const FLARE_ORDER = { X: 0, M: 1, C: 2, B: 3, A: 4 }

const SEV_STYLE = {
  CRITICAL: 'bg-red-500/15 text-red-400 border-red-500/25',
  HIGH:     'bg-orange-500/15 text-orange-400 border-orange-500/25',
  MEDIUM:   'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
  LOW:      'bg-green-500/15 text-green-400 border-green-500/25',
}

export default function SolarStatus({ alerts }) {
  const solarAlerts = (alerts || []).filter(a => a.alert_type === 'SOLAR_FLARE')

  const classCounts = {}
  solarAlerts.forEach(a => {
    // Match "Solar Flare class M1.3 detected" or legacy "Solar Flare M1.3 detected"
    const m = a.description?.match(/(?:class\s+)?([XMCBA])\d/i)
    const l = m ? m[1].toUpperCase() : null
    if (l) classCounts[l] = (classCounts[l] || 0) + 1
  })

  const chartData = Object.entries(classCounts)
    .map(([name, count]) => ({ name, count, color: FLARE_COLORS[name] || '#94a3b8' }))
    .sort((a, b) => (FLARE_ORDER[a.name] ?? 9) - (FLARE_ORDER[b.name] ?? 9))

  const hasXorM = solarAlerts.some(a =>
    /(?:class\s+)?[XM]\d/i.test(a.description || '')
  )

  return (
    <div
      className="cosmic-card p-4"
      style={{
        borderColor: hasXorM ? 'rgba(245,158,11,0.3)' : 'rgba(245,158,11,0.15)',
        boxShadow: hasXorM ? '0 0 20px rgba(245,158,11,0.08)' : undefined,
      }}
    >
      <div className="flex items-center gap-2 section-sep" style={{ borderColor: 'rgba(245,158,11,0.12)' }}>
        <Sun
          size={15}
          className="text-amber-400 animate-corona"
        />
        <h2 className="text-[11px] font-bold text-slate-200 tracking-[0.12em] uppercase">Solar Activity</h2>
        <span
          className="ml-auto text-[9px] text-amber-400/70 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20"
          style={hasXorM ? { boxShadow: '0 0 8px rgba(245,158,11,0.2)' } : {}}
        >
          {solarAlerts.length} events
        </span>
      </div>

      {chartData.length > 0 ? (
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#334155" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#334155" fontSize={9} allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(59,130,246,0.05)' }}
                contentStyle={{
                  background: 'rgba(2,8,23,0.97)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  borderRadius: '8px',
                  color: '#f1f5f9',
                  fontSize: '11px',
                }}
              />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {chartData.map((e, i) => (
                  <Cell key={i} fill={e.color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-32 flex flex-col items-center justify-center gap-2">
          <Sun size={20} className="text-amber-400/20 animate-corona" />
          <p className="text-slate-600 text-[11px] text-center">Quiet solar window</p>
          <p className="text-slate-700 text-[10px]">No flare events in this period</p>
        </div>
      )}

      <div className="mt-2 space-y-0 max-h-24 overflow-y-auto">
        {solarAlerts.slice(0, 4).map((a, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="flex items-center gap-2 py-1 border-b border-slate-800/40 last:border-0"
          >
            <span className="text-[10px] text-slate-500 truncate flex-1 leading-snug">
              {a.description}
            </span>
            <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold border ${SEV_STYLE[a.severity] || SEV_STYLE.LOW}`}>
              {a.severity}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

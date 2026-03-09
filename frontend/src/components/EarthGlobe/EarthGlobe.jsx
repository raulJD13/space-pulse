import { Globe } from 'lucide-react'

const CAT_COLORS = {
  'Wildfires':        '#ff4400',
  'Severe Storms':    '#ffc800',
  'Volcanoes':        '#cc44ff',
  'Floods':           '#0088ff',
  'Earthquakes':      '#c87020',
  'Sea and Lake Ice': '#00dfff',
  'Dust and Haze':    '#a0a090',
}

export default function EarthGlobe({ events }) {
  const eventsWithCoords = (events || []).filter(e => e.latitude && e.longitude)

  const categories = {}
  eventsWithCoords.forEach(e => {
    const c = e.category || 'Unknown'
    categories[c] = (categories[c] || 0) + 1
  })

  return (
    <div className="cosmic-card p-5 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 section-sep shrink-0">
        <Globe size={16} className="text-cyan-400" />
        <h2 className="text-sm font-bold text-slate-200 tracking-wide uppercase">Earth Events</h2>
        <span className="ml-auto text-[10px] text-cyan-400/70 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
          {eventsWithCoords.length} active
        </span>
      </div>

      {/* Map container */}
      <div
        className="relative rounded-lg overflow-hidden flex-1 shine-on-hover"
        style={{
          minHeight: 300,
          background: 'linear-gradient(180deg, rgba(0,20,50,0.9) 0%, rgba(0,30,70,0.95) 50%, rgba(0,18,45,0.9) 100%)',
          border: '1px solid rgba(6,182,212,0.12)',
        }}
      >
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.12]" xmlns="http://www.w3.org/2000/svg">
          {/* Latitude lines */}
          {[12.5, 25, 37.5, 50, 62.5, 75, 87.5].map(pct => (
            <line key={`h${pct}`} x1="0" y1={`${pct}%`} x2="100%" y2={`${pct}%`} stroke="#38bdf8" strokeWidth="0.5" />
          ))}
          {/* Equator highlighted */}
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.35" />
          {/* Longitude lines */}
          {[8.33, 16.67, 25, 33.33, 41.67, 50, 58.33, 66.67, 75, 83.33, 91.67].map(pct => (
            <line key={`v${pct}`} x1={`${pct}%`} y1="0" x2={`${pct}%`} y2="100%" stroke="#38bdf8" strokeWidth="0.5" />
          ))}
          {/* Prime meridian highlighted */}
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.25" />
        </svg>

        {/* Coordinate labels */}
        <span className="absolute top-1 left-1.5 text-[8px] text-cyan-500/40 font-mono">90°N</span>
        <span className="absolute bottom-1 left-1.5 text-[8px] text-cyan-500/40 font-mono">90°S</span>
        <span className="absolute left-1.5 text-[8px] text-cyan-500/40 font-mono" style={{ top: '48%' }}>EQ</span>
        <span className="absolute top-1 right-1.5 text-[8px] text-cyan-500/40 font-mono">180°</span>

        {/* Status badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/40 border border-cyan-500/20 rounded-full px-2 py-0.5">
          <div className="live-dot" style={{ width: 5, height: 5 }} />
          <span className="text-[8px] text-cyan-400/70 font-mono tracking-widest">OPERATIONAL</span>
        </div>

        {/* Event dots */}
        {eventsWithCoords.map((event, i) => {
          const x    = ((parseFloat(event.longitude) + 180) / 360) * 100
          const y    = ((90 - parseFloat(event.latitude)) / 180) * 100
          const color = CAT_COLORS[event.category] || '#ffffff'
          const isCritical = event.category === 'Wildfires' || event.category === 'Volcanoes'

          return (
            <div
              key={i}
              className="absolute group cursor-pointer"
              style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)' }}
            >
              {/* Ripple ring for critical events */}
              {isCritical && (
                <div
                  className="absolute rounded-full animate-ripple"
                  style={{
                    width: 14, height: 14,
                    top: -4, left: -4,
                    border: `1px solid ${color}`,
                    opacity: 0.6,
                  }}
                />
              )}
              {/* Dot */}
              <div
                className="w-2.5 h-2.5 rounded-full animate-pulse"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 6px ${color}, 0 0 12px ${color}50`,
                }}
              />
              {/* Tooltip */}
              <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 pointer-events-none">
                <div className="bg-[rgba(6,14,32,0.97)] border border-slate-700/60 rounded-lg px-3 py-2 text-xs whitespace-nowrap shadow-xl">
                  <p className="font-semibold text-slate-100">{event.title}</p>
                  <p className="text-slate-400 mt-0.5">{event.category}</p>
                  {event.event_date && (
                    <p className="text-slate-600 text-[10px] mt-0.5">{event.event_date?.slice(0, 10)}</p>
                  )}
                </div>
                <div className="w-2 h-2 bg-[rgba(6,14,32,0.97)] border-r border-b border-slate-700/60 transform rotate-45 mx-auto -mt-1" />
              </div>
            </div>
          )
        })}

        {eventsWithCoords.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-slate-600 text-sm">No active events with coordinates</p>
          </div>
        )}
      </div>

      {/* Legend */}
      {Object.keys(categories).length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 shrink-0">
          {Object.entries(categories).map(([cat, count]) => (
            <span key={cat} className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: CAT_COLORS[cat] || '#fff', boxShadow: `0 0 4px ${CAT_COLORS[cat] || '#fff'}` }}
              />
              {cat} <span className="text-slate-600">({count})</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

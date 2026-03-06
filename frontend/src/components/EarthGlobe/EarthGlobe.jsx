// src/components/EarthGlobe/EarthGlobe.jsx
// Map visualization of active earth events (flat map using Recharts scatter)
import { Globe } from 'lucide-react'

const categoryColors = {
  'Wildfires': '#ff3c00',
  'Severe Storms': '#ffc800',
  'Volcanoes': '#c800ff',
  'Floods': '#0064ff',
  'Earthquakes': '#8b4513',
  'Sea and Lake Ice': '#00d4ff',
  'Dust and Haze': '#a0a0a0',
}

export default function EarthGlobe({ events }) {
  const eventsWithCoords = (events || []).filter(e => e.latitude && e.longitude)

  // Group events by category for the legend
  const categories = {}
  eventsWithCoords.forEach(e => {
    const cat = e.category || 'Unknown'
    categories[cat] = (categories[cat] || 0) + 1
  })

  return (
    <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-800 h-full">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
        <Globe size={18} className="text-blue-400" />
        <h2 className="text-lg font-bold text-slate-300">Earth Events</h2>
        <span className="ml-auto text-xs text-slate-500">{eventsWithCoords.length} active</span>
      </div>

      {/* Simple event map - dots on a dark rectangle representing Earth */}
      <div className="relative bg-slate-900 rounded-lg overflow-hidden" style={{ height: 280 }}>
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-10">
          {[...Array(7)].map((_, i) => (
            <div key={`h${i}`} className="absolute w-full border-t border-slate-500" style={{ top: `${(i + 1) * 12.5}%` }} />
          ))}
          {[...Array(11)].map((_, i) => (
            <div key={`v${i}`} className="absolute h-full border-l border-slate-500" style={{ left: `${(i + 1) * 8.33}%` }} />
          ))}
        </div>

        {/* Event dots */}
        {eventsWithCoords.map((event, i) => {
          const x = ((parseFloat(event.longitude) + 180) / 360) * 100
          const y = ((90 - parseFloat(event.latitude)) / 180) * 100
          const color = categoryColors[event.category] || '#ffffff'

          return (
            <div
              key={i}
              className="absolute w-2.5 h-2.5 rounded-full animate-pulse cursor-pointer group"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                backgroundColor: color,
                boxShadow: `0 0 6px ${color}`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs whitespace-nowrap z-10">
                <p className="font-bold text-slate-200">{event.title}</p>
                <p className="text-slate-400">{event.category}</p>
              </div>
            </div>
          )
        })}

        {eventsWithCoords.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
            No events with coordinates
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {Object.entries(categories).map(([cat, count]) => (
          <span key={cat} className="flex items-center gap-1 text-xs text-slate-400">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: categoryColors[cat] || '#fff' }}
            />
            {cat} ({count})
          </span>
        ))}
      </div>
    </div>
  )
}

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Globe, X } from 'lucide-react'
import { ComposableMap, Geographies, Geography } from 'react-simple-maps'

// Natural Earth TopoJSON via jsdelivr CDN (no API key required).
// Uses equirectangular projection (scale 127) so dot positions
// (x = (lon+180)/360*100%, y = (90-lat)/180*100%) stay aligned with the map.
const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'

const CAT_COLORS = {
  'Wildfires':        '#ff4400',
  'Severe Storms':    '#ffc800',
  'Volcanoes':        '#cc44ff',
  'Floods':           '#0088ff',
  'Earthquakes':      '#c87020',
  'Sea and Lake Ice': '#00dfff',
  'Dust and Haze':    '#a0a0a0',
}

const TIME_OPTIONS = ['All', '24h', '7d']

// Projection config: equirectangular, scale=127 maps the full globe to 800×400
// so percentage-based dot overlays (equirectangular math) line up exactly.
const PROJ_CONFIG = { scale: 127, center: [0, 0] }

function isCritical(cat) {
  return cat === 'Wildfires' || cat === 'Volcanoes' || cat === 'Severe Storms'
}

function withinHours(dateStr, hours) {
  if (!dateStr) return false
  return (Date.now() - new Date(dateStr).getTime()) < hours * 3600 * 1000
}


export default function EarthGlobe({ events }) {
  const allWithCoords = useMemo(() => {
    const seen = new Set()
    return (events || []).filter(e => {
      if (e.latitude == null || e.longitude == null) return false
      if (e.event_id && seen.has(e.event_id)) return false
      if (e.event_id) seen.add(e.event_id)
      return true
    })
  }, [events])

  const allCategories = useMemo(() => {
    const s = new Set(allWithCoords.map(e => e.category || 'Unknown'))
    return [...s].sort()
  }, [allWithCoords])

  const [activeCats, setActiveCats] = useState(new Set())
  const [timeFilter, setTimeFilter] = useState('All')
  const [selected, setSelected] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)

  const filtered = useMemo(() => {
    let result = allWithCoords
    if (activeCats.size > 0)
      result = result.filter(e => activeCats.has(e.category || 'Unknown'))
    if (timeFilter === '24h')
      result = result.filter(e => withinHours(e.event_date, 24))
    return result
  }, [allWithCoords, activeCats, timeFilter])

  const catCounts = useMemo(() => {
    const m = {}
    filtered.forEach(e => {
      const c = e.category || 'Unknown'
      m[c] = (m[c] || 0) + 1
    })
    return m
  }, [filtered])

  const toggleCat = (cat) => {
    setActiveCats(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const clearFilters = () => {
    setActiveCats(new Set())
    setTimeFilter('All')
  }

  const hasFilters = activeCats.size > 0 || timeFilter !== 'All'

  return (
    <div
      className="cosmic-card card-hero flex flex-col p-4"
      style={{ minHeight: 540 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 section-sep shrink-0">
        <Globe
          size={15}
          className="text-cyan-400"
          style={{ filter: 'drop-shadow(0 0 5px rgba(6,182,212,0.7))' }}
        />
        <h2 className="text-[11px] font-bold text-slate-200 tracking-[0.12em] uppercase">
          Earth Events
        </h2>
        <span
          className="text-[9px] text-cyan-400/80 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/25"
          style={{ boxShadow: '0 0 8px rgba(6,182,212,0.12)' }}
        >
          {filtered.length} active
        </span>

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="ml-1 flex items-center gap-1 text-[9px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={9} /> Clear
          </button>
        )}

        <div className="ml-auto flex items-center gap-1 bg-slate-900/60 rounded-lg p-0.5 border border-slate-800/60">
          {TIME_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => setTimeFilter(opt)}
              className={`text-[9px] px-2 py-0.5 rounded-md transition-all tracking-wider font-medium ${
                timeFilter === opt
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-600 hover:text-slate-400'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter chips */}
      {allCategories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3 shrink-0">
          {allCategories.map(cat => {
            const color = CAT_COLORS[cat] || '#ffffff'
            const active = activeCats.has(cat)
            return (
              <button
                key={cat}
                onClick={() => toggleCat(cat)}
                className={`flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full border transition-all tracking-wide ${
                  active
                    ? 'text-white'
                    : 'text-slate-600 hover:text-slate-400 border-slate-800/60 bg-transparent'
                }`}
                style={active ? {
                  background: `${color}18`,
                  borderColor: `${color}55`,
                  color,
                  boxShadow: `0 0 10px ${color}22`,
                } : {}}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                {cat}
              </button>
            )
          })}
        </div>
      )}

      {/* Map */}
      <div
        className="relative rounded-xl overflow-hidden flex-1 scanline-bg"
        style={{
          minHeight: 300,
          background: 'radial-gradient(ellipse at 50% 35%, rgba(0,38,88,0.96) 0%, rgba(0,8,22,0.99) 100%)',
          border: '1px solid rgba(6,182,212,0.1)',
          boxShadow: 'inset 0 0 80px rgba(0,15,45,0.6)',
        }}
      >
        {/* Real world map — Natural Earth TopoJSON via react-simple-maps */}
        <ComposableMap
          width={800}
          height={400}
          projection="geoEquirectangular"
          projectionConfig={PROJ_CONFIG}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map(geo => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="rgba(14, 46, 78, 0.72)"
                  stroke="rgba(56, 189, 248, 0.32)"
                  strokeWidth={0.3}
                  style={{
                    default: { outline: 'none' },
                    hover:   { outline: 'none' },
                    pressed: { outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>
        </ComposableMap>

        {/* Grid lines overlay */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 800 400"
          preserveAspectRatio="none"
        >
          {[30, 60].map(lat => {
            const yn = ((90 - lat) / 180) * 400
            const ys = ((90 + lat) / 180) * 400
            return (
              <g key={lat}>
                <line x1="0" y1={yn} x2="800" y2={yn} stroke="#1e3a5f" strokeWidth="0.6" strokeOpacity="0.7" />
                <line x1="0" y1={ys} x2="800" y2={ys} stroke="#1e3a5f" strokeWidth="0.6" strokeOpacity="0.7" />
              </g>
            )
          })}
          {[60, 120, 180, 240, 300].map(lon => (
            <line key={lon} x1={(lon / 360) * 800} y1="0" x2={(lon / 360) * 800} y2="400" stroke="#1e3a5f" strokeWidth="0.6" strokeOpacity="0.7" />
          ))}
          {/* Equator */}
          <line x1="0" y1="200" x2="800" y2="200" stroke="#06b6d4" strokeWidth="1.4" strokeOpacity="0.3" />
          {/* Prime meridian */}
          <line x1="400" y1="0" x2="400" y2="400" stroke="#06b6d4" strokeWidth="0.8" strokeOpacity="0.18" />
        </svg>

        {/* Scan sweep line */}
        <div className="scan-line" />

        {/* Atmosphere top glow */}
        <div
          className="absolute inset-0 pointer-events-none rounded-xl"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(6,182,212,0.055) 0%, transparent 55%)',
          }}
        />

        {/* Corner labels */}
        <span className="absolute top-1.5 left-2 text-[7px] text-cyan-500/35 font-mono pointer-events-none">90°N</span>
        <span className="absolute bottom-1.5 left-2 text-[7px] text-cyan-500/35 font-mono pointer-events-none">90°S</span>
        <span className="absolute top-1.5 right-2 text-[7px] text-cyan-500/35 font-mono pointer-events-none">180°</span>
        <span className="absolute top-1.5 left-1/2 -translate-x-1/2 text-[7px] text-cyan-500/22 font-mono pointer-events-none">0°</span>

        {/* OPERATIONAL badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 border border-cyan-500/18 rounded-full px-2.5 py-0.5">
          <div className="live-dot" style={{ width: 5, height: 5 }} />
          <span className="text-[7px] text-cyan-400/55 font-mono tracking-widest">OPS</span>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-1">
              <Globe size={20} className="text-slate-700 mx-auto" />
              <p className="text-slate-600 text-xs">
                {hasFilters ? 'No events match current filters' : 'No active events with coordinates'}
              </p>
            </div>
          </div>
        )}

        {/* Event dots */}
        {filtered.map((event, i) => {
          const x = ((parseFloat(event.longitude) + 180) / 360) * 100
          const y = ((90 - parseFloat(event.latitude)) / 180) * 100
          const color = CAT_COLORS[event.category] || '#ffffff'
          const critical = isCritical(event.category)
          const eventKey = event.event_id || i
          const isSelected = selected?.event_id === event.event_id
          const isHovered = hoveredId === eventKey

          return (
            <div
              key={eventKey}
              className="absolute cursor-pointer"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: isSelected || isHovered ? 30 : 10,
              }}
              onClick={() => setSelected(selected?.event_id === event.event_id ? null : event)}
              onMouseEnter={() => setHoveredId(eventKey)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Critical ripple rings — centered via calc to avoid drift on scale */}
              {critical && [0, 0.8, 1.6].map((delay, ri) => (
                <div
                  key={ri}
                  style={{
                    position: 'absolute',
                    left: 'calc(50% - 11px)',
                    top: 'calc(50% - 11px)',
                    width: 22, height: 22,
                    borderRadius: '50%',
                    border: `1px solid ${color}`,
                    animation: `ripple-out 2.4s ease-out ${delay}s infinite`,
                  }}
                />
              ))}

              {/* Dot */}
              <div
                className={`rounded-full ${critical ? 'w-3 h-3' : 'w-2 h-2'}`}
                style={{
                  background: color,
                  transform: `scale(${isSelected ? 1.8 : isHovered ? 1.5 : 1})`,
                  transition: 'transform 0.18s ease-out, box-shadow 0.18s ease-out',
                  boxShadow: isHovered || isSelected
                    ? `0 0 ${critical ? 14 : 8}px ${color}, 0 0 ${critical ? 28 : 16}px ${color}60`
                    : `0 0 ${critical ? 8 : 4}px ${color}, 0 0 ${critical ? 16 : 8}px ${color}40`,
                }}
              />

              {/* Tooltip */}
              {isHovered && (
                <div
                  className="absolute z-40 pointer-events-none"
                  style={{
                    bottom: 'calc(100% + 8px)',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <div
                    className="rounded-lg px-2.5 py-1.5 shadow-xl"
                    style={{
                      background: 'rgba(2,8,23,0.97)',
                      border: `1px solid ${color}45`,
                      boxShadow: `0 4px 16px rgba(0,0,0,0.6), 0 0 12px ${color}18`,
                    }}
                  >
                    <p className="font-semibold text-slate-100 text-[11px]">{event.title}</p>
                    <p className="text-[9px] mt-0.5" style={{ color }}>{event.category}</p>
                  </div>
                  <div
                    className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
                    style={{
                      borderLeft: '4px solid transparent',
                      borderRight: '4px solid transparent',
                      borderTop: `4px solid ${color}45`,
                    }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Tactical detail panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
            className="overflow-hidden"
          >
            <div
              className="mt-3 rounded-xl p-3.5 relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${CAT_COLORS[selected.category] || '#fff'}0a, transparent)`,
                border: `1px solid ${CAT_COLORS[selected.category] || '#fff'}30`,
                boxShadow: `inset 0 0 40px ${CAT_COLORS[selected.category] || '#fff'}05`,
              }}
            >
              {/* Left accent bar */}
              <div
                className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full"
                style={{
                  background: `linear-gradient(to bottom, ${CAT_COLORS[selected.category] || '#fff'}, ${CAT_COLORS[selected.category] || '#fff'}20)`,
                }}
              />
              <div className="pl-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-slate-200 leading-snug mb-2">
                    {selected.title}
                  </p>
                  <div className="flex flex-wrap gap-1.5 text-[9px]">
                    <span
                      className="px-2 py-0.5 rounded font-mono font-semibold"
                      style={{
                        background: `${CAT_COLORS[selected.category] || '#fff'}18`,
                        color: CAT_COLORS[selected.category] || '#fff',
                      }}
                    >
                      {selected.category}
                    </span>
                    {selected.event_date && (
                      <span className="text-slate-500 font-mono px-2 py-0.5 bg-slate-800/50 rounded">
                        {selected.event_date?.slice(0, 10)}
                      </span>
                    )}
                    {selected.latitude != null && (
                      <span className="text-slate-600 font-mono px-2 py-0.5 bg-slate-800/40 rounded">
                        {parseFloat(selected.latitude).toFixed(2)}°,&nbsp;
                        {parseFloat(selected.longitude).toFixed(2)}°
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full capitalize ${
                      selected.status === 'open'
                        ? 'bg-green-500/12 text-green-400 border border-green-500/20'
                        : 'bg-slate-500/12 text-slate-400 border border-slate-500/20'
                    }`}>
                      {selected.status || 'active'}
                    </span>
                  </div>
                  {selected.source_url && (
                    <a
                      href={selected.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] text-cyan-500 hover:text-cyan-300 mt-2 inline-flex items-center gap-1 transition-colors"
                    >
                      View satellite data →
                    </a>
                  )}
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="shrink-0 text-slate-600 hover:text-slate-300 transition-colors mt-0.5 p-1 rounded hover:bg-white/5"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      {Object.keys(catCounts).length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 shrink-0">
          {Object.entries(catCounts).map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => toggleCat(cat)}
              className={`flex items-center gap-1.5 text-[10px] transition-all ${
                activeCats.has(cat) ? 'text-slate-300' : 'text-slate-600 hover:text-slate-400'
              }`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  background: CAT_COLORS[cat] || '#fff',
                  boxShadow: `0 0 4px ${CAT_COLORS[cat] || '#fff'}80`,
                }}
              />
              {cat}
              <span className="text-slate-700">({count})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

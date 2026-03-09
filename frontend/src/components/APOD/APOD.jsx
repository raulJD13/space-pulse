import { useState, useEffect, useRef } from 'react'
import { Camera, PlayCircle, ExternalLink } from 'lucide-react'
import { fetchApod } from '../../api/spaceApi'

export default function APOD() {
  const [apod, setApod] = useState(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const cardRef = useRef()

  useEffect(() => {
    fetchApod().then(setApod).catch(() => {})
  }, [])

  const handleMouseMove = (e) => {
    const r = cardRef.current?.getBoundingClientRect()
    if (!r) return
    const nx = (e.clientX - r.left) / r.width
    const ny = (e.clientY - r.top) / r.height
    setTilt({ x: (ny - 0.5) * -5, y: (nx - 0.5) * 7 })
  }

  const handleMouseLeave = () => setTilt({ x: 0, y: 0 })

  const imgUrl = apod
    ? (apod.media_type === 'video' ? (apod.thumbnail_url || '') : apod.url)
    : null

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="cosmic-card overflow-hidden border border-violet-500/25 hover:border-violet-500/50 transition-all duration-300"
      style={{
        transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: tilt.x === 0 && tilt.y === 0
          ? 'transform 0.6s ease-out, border-color 0.3s ease, box-shadow 0.3s ease'
          : 'transform 0.1s ease-out',
        boxShadow: '0 0 40px rgba(139, 92, 246, 0.08)',
        willChange: 'transform',
      }}
    >
      <div className="flex flex-col lg:flex-row">

        {/* ── Left: Image (60%) ── */}
        <div className="lg:w-[60%] shrink-0">
          {imgUrl ? (
            <div className="apod-glow-border h-full" style={{ minHeight: '360px' }}>
              <img
                src={imgUrl}
                alt={apod?.title || 'Astronomy Picture of the Day'}
                className="w-full h-full object-cover"
                style={{ minHeight: '360px', maxHeight: '520px' }}
              />
              {apod?.media_type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/30">
                  <PlayCircle size={64} className="text-white/80 drop-shadow-lg" />
                </div>
              )}
            </div>
          ) : (
            <div
              className="h-full flex items-center justify-center bg-gradient-to-br from-violet-950/40 to-indigo-950/40"
              style={{ minHeight: '360px' }}
            >
              <Camera size={48} className="text-violet-400/30 animate-pulse" />
            </div>
          )}
        </div>

        {/* ── Right: Content (40%) ── */}
        <div className="lg:w-[40%] flex flex-col justify-between p-6 lg:p-8">
          <div>
            {/* Section label */}
            <div className="flex items-center gap-2 mb-4">
              <Camera size={13} className="text-violet-400" />
              <span className="text-[10px] uppercase tracking-[0.22em] text-violet-400 font-semibold">
                Astronomy Picture of the Day
              </span>
            </div>

            {apod ? (
              <>
                {/* Date badge */}
                <span className="inline-block text-[11px] text-slate-500 bg-slate-800/60 border border-slate-700/50 rounded-full px-3 py-0.5 mb-3">
                  {apod.date}
                </span>

                {/* Title */}
                <h2 className="text-2xl lg:text-[1.6rem] font-bold text-white leading-snug mb-4 text-glow-violet">
                  {apod.title}
                </h2>

                {/* Explanation */}
                <div className="relative">
                  <p className="text-sm text-slate-300/90 leading-relaxed line-clamp-[7]">
                    {apod.explanation}
                  </p>
                  <div
                    className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none"
                    style={{ background: 'linear-gradient(to top, rgba(6,14,32,0.9), transparent)' }}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3 mt-2">
                <div className="h-4 w-24 bg-slate-800/60 rounded animate-pulse" />
                <div className="h-7 w-3/4 bg-slate-800/60 rounded animate-pulse" />
                <div className="h-3 w-full bg-slate-800/60 rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-slate-800/60 rounded animate-pulse" />
                <div className="h-3 w-4/5 bg-slate-800/60 rounded animate-pulse" />
              </div>
            )}
          </div>

          {/* Footer */}
          {apod && (
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
              {apod.copyright && (
                <p className="text-xs text-slate-600">© {apod.copyright}</p>
              )}
              {apod.media_type === 'video' && apod.url && (
                <a
                  href={apod.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors"
                >
                  <ExternalLink size={12} />
                  Watch video
                </a>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

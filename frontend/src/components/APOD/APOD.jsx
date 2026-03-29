import { useState, useEffect, useRef } from 'react'
import { Camera, PlayCircle, ExternalLink, Calendar, User } from 'lucide-react'
import { fetchApod } from '../../api/spaceApi'

export default function APOD() {
  const [apod, setApod] = useState(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const cardRef = useRef()

  useEffect(() => {
    fetchApod().then(setApod).catch(() => {})
  }, [])

  const onMove = (e) => {
    const r = cardRef.current?.getBoundingClientRect()
    if (!r) return
    setTilt({
      x: ((e.clientY - r.top)  / r.height - 0.5) * -7,
      y: ((e.clientX - r.left) / r.width  - 0.5) *  9,
    })
  }
  const onLeave = () => setTilt({ x: 0, y: 0 })

  const isResting = tilt.x === 0 && tilt.y === 0

  const imgUrl = apod
    ? (apod.media_type === 'video' ? (apod.thumbnail_url || '') : apod.url)
    : null

  return (
    <div className="aurora-border">
      <div
        ref={cardRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="cosmic-card overflow-hidden"
        style={{
          borderColor: 'rgba(139,92,246,0.18)',
          transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: isResting
            ? 'transform 0.75s cubic-bezier(0.23, 1, 0.32, 1), border-color 0.3s'
            : 'transform 0.08s ease-out',
          willChange: 'transform',
        }}
      >
        {/* Image area */}
        <div className="relative overflow-hidden" style={{ height: 210 }}>
          {imgUrl ? (
            <>
              <img
                src={imgUrl}
                alt={apod?.title || 'APOD'}
                className="w-full h-full object-cover"
                style={{
                  transform: `scale(1.07) translateX(${tilt.y * -0.25}px) translateY(${tilt.x * 0.2}px)`,
                  transition: isResting
                    ? 'transform 0.75s cubic-bezier(0.23, 1, 0.32, 1)'
                    : 'transform 0.08s ease-out',
                }}
              />

              {/* Deep gradient overlay */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(to top, rgba(6,10,25,0.96) 0%, rgba(6,10,25,0.28) 48%, transparent 72%)',
                }}
              />
              {/* Vignette */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(ellipse at center, transparent 58%, rgba(2,8,23,0.45) 100%)',
                }}
              />

              {/* Media type badge */}
              <span
                className="absolute top-2.5 left-2.5 text-[8px] tracking-widest uppercase font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(139,92,246,0.32)',
                  border: '1px solid rgba(139,92,246,0.5)',
                  color: '#c4b5fd',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 0 14px rgba(139,92,246,0.28)',
                }}
              >
                {apod?.media_type || 'image'}
              </span>

              {apod?.media_type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: 'rgba(139,92,246,0.22)',
                      border: '1px solid rgba(139,92,246,0.5)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: '0 0 20px rgba(139,92,246,0.3)',
                    }}
                  >
                    <PlayCircle size={22} className="text-violet-300" />
                  </div>
                </div>
              )}

              {/* Title overlay */}
              {apod?.title && (
                <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
                  <p
                    className="text-[13px] font-bold text-white leading-snug line-clamp-2"
                    style={{ textShadow: '0 1px 10px rgba(0,0,0,0.95), 0 0 30px rgba(0,0,0,0.7)' }}
                  >
                    {apod.title}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, rgba(88,28,135,0.22), rgba(30,64,175,0.16))',
              }}
            >
              <Camera size={26} className="text-violet-400/35 animate-pulse" />
              <p className="text-[9px] text-slate-700 tracking-[0.2em] uppercase">Loading</p>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div className="p-3 space-y-2">
          <p className="text-[8px] text-violet-400/65 tracking-[0.22em] uppercase font-bold">
            Astronomy Picture of the Day
          </p>

          {apod?.title && (
            <p className="text-[12px] font-semibold text-slate-200 leading-snug">
              {apod.title}
            </p>
          )}

          {apod ? (
            <div className="flex flex-wrap gap-1.5">
              {apod.date && (
                <span className="flex items-center gap-1 text-[9px] text-slate-400 bg-slate-800/70 border border-slate-700/40 rounded-full px-2 py-0.5">
                  <Calendar size={8} />
                  {apod.date}
                </span>
              )}
              {apod.copyright && (
                <span className="flex items-center gap-1 text-[9px] text-slate-500 bg-slate-800/50 border border-slate-700/30 rounded-full px-2 py-0.5 max-w-[130px]">
                  <User size={8} />
                  <span className="truncate">{apod.copyright.trim()}</span>
                </span>
              )}
              {apod.media_type === 'video' && apod.url && (
                <a
                  href={apod.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[9px] text-violet-400 hover:text-violet-300 transition-colors bg-violet-500/10 border border-violet-500/22 rounded-full px-2 py-0.5"
                >
                  <ExternalLink size={8} />
                  Watch
                </a>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="h-2 w-3/4 bg-slate-800/60 rounded animate-pulse" />
              <div className="h-2 w-1/2 bg-slate-800/40 rounded animate-pulse" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

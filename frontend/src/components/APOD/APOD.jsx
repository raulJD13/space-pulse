// src/components/APOD/APOD.jsx
import { useState, useEffect } from 'react'
import { Camera } from 'lucide-react'
import { fetchApod } from '../../api/spaceApi'

export default function APOD() {
  const [apod, setApod] = useState(null)

  useEffect(() => {
    fetchApod()
      .then(data => setApod(data))
      .catch(() => {})
  }, [])

  if (!apod) {
    return (
      <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
          <Camera size={18} className="text-indigo-400" />
          <h2 className="text-lg font-bold text-slate-300">Picture of the Day</h2>
        </div>
        <div className="h-40 flex items-center justify-center text-slate-500 text-sm">
          Loading APOD...
        </div>
      </div>
    )
  }

  const imgUrl = apod.media_type === 'video'
    ? (apod.thumbnail_url || '')
    : apod.url

  return (
    <div className="bg-slate-800/30 p-5 rounded-xl border border-slate-800">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-700 pb-2">
        <Camera size={18} className="text-indigo-400" />
        <h2 className="text-lg font-bold text-slate-300">Picture of the Day</h2>
        <span className="ml-auto text-xs text-slate-500">{apod.date}</span>
      </div>

      {imgUrl && (
        <img
          src={imgUrl}
          alt={apod.title}
          className="w-full h-40 object-cover rounded-lg mb-3"
        />
      )}

      <h3 className="text-sm font-bold text-slate-200">{apod.title}</h3>
      <p className="text-xs text-slate-400 mt-1 line-clamp-3">{apod.explanation}</p>

      {apod.copyright && (
        <p className="text-xs text-slate-600 mt-2">Credit: {apod.copyright}</p>
      )}
    </div>
  )
}

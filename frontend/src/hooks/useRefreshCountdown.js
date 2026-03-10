import { useState, useEffect } from 'react'

const POLL_MS = parseInt(import.meta.env?.VITE_POLL_INTERVAL_MS || '300000')

export function useRefreshCountdown(lastUpdated) {
  const [remaining, setRemaining] = useState(POLL_MS)

  useEffect(() => {
    if (!lastUpdated) return
    const tick = () => {
      const elapsed = Date.now() - lastUpdated.getTime()
      setRemaining(Math.max(0, POLL_MS - elapsed))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [lastUpdated])

  const mins = Math.floor(remaining / 60000)
  const secs = Math.floor((remaining % 60000) / 1000)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Animates a number from 0 to target value
import { useState, useEffect, useRef } from 'react'

export function useCountUp(target, duration = 1000) {
  const [count, setCount] = useState(0)
  const rafRef = useRef()
  const startRef = useRef()

  useEffect(() => {
    const to = Number(target) || 0
    startRef.current = null

    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setCount(Math.round(to * eased))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return count
}

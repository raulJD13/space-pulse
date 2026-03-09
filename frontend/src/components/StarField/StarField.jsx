import { useEffect, useRef } from 'react'

export default function StarField() {
  const ref = useRef()

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let raf

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const COUNT = 280
    const stars = Array.from({ length: COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.2,
      alpha: Math.random(),
      da:    (Math.random() - 0.5) * 0.015,
    }))

    let shooting = []
    const addShot = () => {
      shooting.push({
        x:     Math.random() * canvas.width,
        y:     Math.random() * canvas.height * 0.45,
        len:   Math.random() * 90 + 50,
        speed: Math.random() * 7 + 5,
        alpha: 1,
        angle: Math.PI * 0.22 + (Math.random() - 0.5) * 0.3,
      })
    }
    const timer = setInterval(addShot, 4500)

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const s of stars) {
        s.alpha += s.da
        if (s.alpha <= 0.05 || s.alpha >= 1) s.da *= -1
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${s.alpha.toFixed(2)})`
        ctx.fill()
      }

      shooting = shooting.filter(s => s.alpha > 0)
      for (const s of shooting) {
        const x2 = s.x - Math.cos(s.angle) * s.len
        const y2 = s.y - Math.sin(s.angle) * s.len
        const g = ctx.createLinearGradient(s.x, s.y, x2, y2)
        g.addColorStop(0, `rgba(200,220,255,${s.alpha.toFixed(2)})`)
        g.addColorStop(1, 'rgba(200,220,255,0)')
        ctx.save()
        ctx.globalAlpha = s.alpha
        ctx.strokeStyle = g
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(s.x, s.y)
        ctx.lineTo(x2, y2)
        ctx.stroke()
        ctx.restore()
        s.x += Math.cos(s.angle) * s.speed
        s.y += Math.sin(s.angle) * s.speed
        s.alpha -= 0.014
      }

      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      clearInterval(timer)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={ref} className="starfield" />
}

import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppData } from '@/context/AppDataContext'
import { LELE_ID } from '@/utils/palpitesConfig'
import s from './LeleEffects.module.css'

const CONFETTI_KEY = 'lele-confetti-session'
const COLORS = ['#ff0099', '#ff66cc', '#ff99dd', '#ffccee', '#ff33aa', '#ff007f']
const N = 24

const PIECES = Array.from({ length: N }, (_, i) => ({
  left:     `${2 + (i * (96 / N))}%`,
  color:    COLORS[i % COLORS.length],
  delay:    `${(i * 0.14).toFixed(2)}s`,
  duration: `${1.6 + (i % 6) * 0.35}s`,
  size:     6 + (i % 5) * 2,
  round:    i % 3 === 0,
}))

export default function LeleEffects() {
  const { user } = useAppData()
  const { pathname } = useLocation()
  const isLele = user?.id === LELE_ID
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (isLele) {
      document.documentElement.setAttribute('data-lele', 'true')
    } else {
      document.documentElement.removeAttribute('data-lele')
    }
    return () => { document.documentElement.removeAttribute('data-lele') }
  }, [isLele])

  useEffect(() => {
    if (!isLele) return
    if (!sessionStorage.getItem(CONFETTI_KEY)) {
      setShowConfetti(true)
      sessionStorage.setItem(CONFETTI_KEY, '1')
      const t = setTimeout(() => setShowConfetti(false), 5000)
      return () => clearTimeout(t)
    }
  }, [isLele])

  if (!isLele || !showConfetti || pathname.startsWith('/wrapped')) return null

  return (
    <div className={s.container} aria-hidden="true">
      {PIECES.map((p, i) => (
        <div
          key={i}
          className={s.piece}
          style={{
            left:              p.left,
            background:        p.color,
            animationDelay:    p.delay,
            animationDuration: p.duration,
            width:             p.size,
            height:            p.size,
            borderRadius:      p.round ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  )
}

import { useEffect, useRef } from 'react'
import confetti from 'canvas-confetti'
import s from './PodiumHypeScene.module.css'

export default function PodiumHypeScene() {
  const fired = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => {
      if (fired.current) return
      fired.current = true
      confetti({
        particleCount: 55,
        spread: 100,
        startVelocity: 32,
        origin: { y: 0.5 },
        colors: ['#00D4FF', '#7C3AED', '#FF3B30', '#f59e0b'],
      })
    }, 850)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={s.card}>
      <div className={s.pre}>E vamos para o que interessa...</div>
      <div className={s.podiumWord}>
        <span className={s.trophy}>🏆</span> O PÓDIO
      </div>
    </div>
  )
}

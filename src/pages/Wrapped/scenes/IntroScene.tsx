import { useEffect, useMemo, useRef } from 'react'
import confetti from 'canvas-confetti'
import { Sparkles } from 'lucide-react'
import s from './scenes.module.css'
import ss from './IntroScene.module.css'

interface Props {
  name?: string
}

const FLOAT_EMOJIS = ['⚽', '🏆', '🎉', '⭐', '🔥', '🎊', '⚡', '🥅']

function buildFloaters() {
  return FLOAT_EMOJIS.flatMap((emoji, i) =>
    Array.from({ length: 2 }, (_, j) => ({
      emoji,
      left: `${(i * 13 + j * 47 + 5) % 92}%`,
      delay: `${(i * 0.6 + j * 2.1).toFixed(2)}s`,
      duration: `${7 + ((i + j) % 4)}s`,
      size: 18 + ((i + j) % 3) * 8,
    }))
  )
}

export default function IntroScene({ name }: Props) {
  const firstName = name?.split(' ')[0] ?? ''
  const floaters = useMemo(() => buildFloaters(), [])
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    confetti({ particleCount: 60, spread: 100, startVelocity: 35, origin: { y: 0.5 }, colors: ['#00D4FF', '#7C3AED', '#FF3B30', '#f59e0b'] })
  }, [])

  return (
    <div className={`${s.card} ${ss.root}`}>
      <div className={ss.floaters} aria-hidden="true">
        {floaters.map((f, i) => (
          <span
            key={i}
            className={ss.floater}
            style={{ left: f.left, animationDelay: f.delay, animationDuration: f.duration, fontSize: f.size }}
          >
            {f.emoji}
          </span>
        ))}
      </div>

      <div className={ss.content}>
        <div className={`${s.icon} ${ss.iconPop}`}><Sparkles size={26} /></div>
        <div className={`${s.eyebrow} ${ss.eyebrowIn}`}>Cravou 2026</div>
        <div className={ss.headline}>
          A Copa acabou{firstName ? `, ${firstName}` : ''}!<br />Sua retrospectiva chegou
        </div>
        <div className={ss.trophy}>🏆</div>
        <div className={ss.cta}>Toque para começar</div>
      </div>
    </div>
  )
}

import { useEffect } from 'react'
import s from './CravouCelebration.module.css'

const PARTICLES = [
  { tx: '-130px', ty: '-150px', color: '#00D4FF', size: 10 },
  { tx:  '130px', ty: '-150px', color: '#22c55e', size: 8 },
  { tx: '-170px', ty:  '-50px', color: '#f59e0b', size: 12 },
  { tx:  '170px', ty:  '-50px', color: '#00D4FF', size: 8 },
  { tx:  '-90px', ty:  '150px', color: '#22c55e', size: 10 },
  { tx:   '90px', ty:  '150px', color: '#f59e0b', size: 8 },
  { tx: '-190px', ty:   '50px', color: '#00D4FF', size: 6 },
  { tx:  '190px', ty:   '50px', color: '#22c55e', size: 6 },
  { tx:    '0px', ty: '-180px', color: '#f59e0b', size: 10 },
  { tx:    '0px', ty:  '180px', color: '#00D4FF', size: 8 },
  { tx: '-110px', ty: '-110px', color: '#f59e0b', size: 6 },
  { tx:  '110px', ty: '-110px', color: '#22c55e', size: 12 },
  { tx: '-150px', ty:  '100px', color: '#00D4FF', size: 8 },
  { tx:  '150px', ty:  '100px', color: '#f59e0b', size: 6 },
  { tx:  '-60px', ty:  '170px', color: '#22c55e', size: 10 },
  { tx:   '60px', ty:  '170px', color: '#00D4FF', size: 8 },
]

interface Props {
  show: boolean
  points?: number
  onDismiss: () => void
}

export default function CravouCelebration({ show, points = 10, onDismiss }: Props) {
  useEffect(() => {
    if (!show) return
    const t = setTimeout(onDismiss, 3800)
    return () => clearTimeout(t)
  }, [show, onDismiss])

  if (!show) return null

  return (
    <div className={s.overlay} onClick={onDismiss}>
      <div className={s.particles}>
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className={s.particle}
            style={{
              '--tx': p.tx,
              '--ty': p.ty,
              '--delay': `${i * 0.03}s`,
              background: p.color,
              width: p.size,
              height: p.size,
              borderRadius: i % 3 === 0 ? '2px' : '50%',
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className={s.content}>
        <img src="/logo-ball.png" className={s.ball} alt="" />
        <div className={s.title}>CRAVOU!</div>
        <div className={s.sub}>Placar exato!</div>
        <div className={s.pts}>+{points} <span>pontos</span></div>
      </div>

      <div className={s.hint}>Toque para fechar</div>
    </div>
  )
}

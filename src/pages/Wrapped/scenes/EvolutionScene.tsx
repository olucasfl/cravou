import { TrendingUp } from 'lucide-react'
import type { EvolutionPoint } from '@/utils/wrappedStats'
import s from './scenes.module.css'
import ss from './EvolutionScene.module.css'

interface Props {
  points: EvolutionPoint[]
}

const WIDTH = 300
const HEIGHT = 140
const PADDING = 14

export default function EvolutionScene({ points }: Props) {
  if (points.length < 2) {
    return (
      <div className={s.card}>
        <div className={s.icon}><TrendingUp size={26} /></div>
        <div className={s.eyebrow}>Sua evolução na Copa</div>
        <div className={s.empty}>Poucos jogos pontuados pra desenhar sua curva dessa vez.</div>
      </div>
    )
  }

  const maxPts = Math.max(...points.map(p => p.cumulativePoints), 1)
  const stepX = (WIDTH - PADDING * 2) / (points.length - 1)
  const coords = points
    .map((p, i) => {
      const x = PADDING + i * stepX
      const y = HEIGHT - PADDING - (p.cumulativePoints / maxPts) * (HEIGHT - PADDING * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const total = points[points.length - 1].cumulativePoints

  return (
    <div className={s.card}>
      <div className={s.icon}><TrendingUp size={26} /></div>
      <div className={s.eyebrow}>Sua evolução na Copa</div>
      <svg className={ss.chart} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none">
        <polyline
          className={ss.line}
          points={coords}
          fill="none"
          pathLength={1}
        />
      </svg>
      <div className={s.headline}>{total} pontos acumulados ao longo da Copa</div>
    </div>
  )
}

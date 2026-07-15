import { Target } from 'lucide-react'
import type { CravadaHit } from '@/utils/wrappedStats'
import { useCountUp } from '@/hooks/useCountUp'
import s from './scenes.module.css'

interface Props {
  hits: CravadaHit[]
}

export default function CravadasScene({ hits }: Props) {
  const count = useCountUp(hits.length)

  if (hits.length === 0) {
    return (
      <div className={s.card}>
        <div className={s.icon}><Target size={26} /></div>
        <div className={s.eyebrow}>Cravadas</div>
        <div className={s.empty}>Você não cravou nenhum placar dessa vez — ano que vem tem mais!</div>
      </div>
    )
  }

  return (
    <div className={s.card}>
      <div className={s.icon}><Target size={26} /></div>
      <div className={s.eyebrow}>Cravadas</div>
      <div className={s.bigNumber}>{count}</div>
      <div className={s.headline}>{hits.length === 1 ? 'placar cravado' : 'placares cravados'}</div>
      <div className={s.chipList}>
        {hits.map((h, i) => (
          <div key={h.matchId} className={s.chip} style={{ animationDelay: `${i * 0.05}s` }}>
            <span>{h.homeTeam} x {h.awayTeam}</span>
            <b>{h.homeScore}-{h.awayScore}</b>
          </div>
        ))}
      </div>
    </div>
  )
}
